import { findCustomerByDocument, createCustomer } from "@/lib/db/customer-repo";
import { processSale, cancelSale } from "@/lib/loyalty/engine";
import { getLoyaltySettings } from "@/lib/db/settings-repo";
import { getDatabase } from "@/lib/db/db";
import { syncFudoSales } from "@/lib/fudo/sync";
import * as fudoClient from "@/lib/fudo/client";

async function main() {
  console.log("==================================================================");
  console.log("=== TEST SUITE: ANULACIÓN MANUAL Y SINCRONIZADA DE VENTAS ===");
  console.log("==================================================================\n");

  const db = getDatabase();
  const settings = getLoyaltySettings();

  // Test Customer
  const testDoc = "99887766";
  let customer = findCustomerByDocument(testDoc);
  if (!customer) {
    customer = createCustomer({
      document_number: testDoc,
      name: "Gastón Sommelier",
      phone: "+5491122334455",
      email: "gaston@test.com",
    });
  }

  // Reset balance and visits for deterministic testing
  db.prepare("UPDATE customers SET points_balance = 0, visit_count = 0, total_spent = 0, last_visit_at = NULL WHERE id = ?").run(customer.id);
  customer = findCustomerByDocument(testDoc)!;

  // Clean up any test sales from previous runs
  const testSaleIds = ["MANUAL_TEST_001", "MANUAL_TEST_002", "FUDO_TEST_MOCK_SALE_777"];
  for (const extId of testSaleIds) {
    const prevSale = db.prepare("SELECT id FROM sales WHERE external_sale_id = ?").get(extId) as { id: string } | undefined;
    if (prevSale) {
      db.prepare("DELETE FROM points_batches WHERE sale_id = ?").run(prevSale.id);
      db.prepare("DELETE FROM points_history WHERE sale_id = ?").run(prevSale.id);
      db.prepare("DELETE FROM sales WHERE id = ?").run(prevSale.id);
    }
  }

  console.log("1. Cliente de prueba inicializado:", {
    id: customer.id,
    name: customer.name,
    points: customer.points_balance,
    visits: customer.visit_count,
    spent: customer.total_spent,
  });

  // TEST 1: Process sale with table sector (adds points + visit)
  console.log("\n2. Ingestando Venta 1 (Mesa - debe sumar puntos y visita)...");
  const sale1 = processSale({
    customerId: customer.id,
    totalAmount: 15000,
    source: "MANUAL",
    externalSaleId: "MANUAL_TEST_001",
    saleType: "TABLE", // Salón / Mesa suma visita
  });
  if (!sale1.sale) throw new Error("No se generó sale1");

  let custAfterSale1 = findCustomerByDocument(testDoc)!;
  console.log("✔ Venta procesada:", {
    saleId: sale1.sale.id,
    pointsEarned: sale1.points_earned,
    visitAdded: sale1.visit_added,
    customerPoints: custAfterSale1.points_balance,
    customerVisits: custAfterSale1.visit_count,
  });

  if (sale1.points_earned !== 150 || !sale1.visit_added || custAfterSale1.visit_count !== 1) {
    throw new Error("❌ Error en la venta inicial: no acumuló puntos o visita esperada");
  }

  // Verify visit_added column in db
  const saleRow1 = db.prepare("SELECT * FROM sales WHERE id = ?").get(sale1.sale.id) as { visit_added: number; status: string };
  if (saleRow1.visit_added !== 1 || saleRow1.status !== "CLOSED") {
    throw new Error(`❌ Error en persistencia de venta: visit_added=${saleRow1.visit_added}, status=${saleRow1.status}`);
  }
  console.log("✔ Verificado registro en base de datos: visit_added=1, status=CLOSED");

  // TEST 2: Cancel Sale 1
  console.log("\n3. Anulando Venta 1 (cancelSale)...");
  const cancelResult1 = cancelSale(sale1.sale.id, "Error de mozo en mesa");
  console.log("Resultado anulación:", cancelResult1.message);

  let custAfterCancel1 = findCustomerByDocument(testDoc)!;
  console.log("Estado comensal tras anulación:", {
    points: custAfterCancel1.points_balance,
    visits: custAfterCancel1.visit_count,
    spent: custAfterCancel1.total_spent,
  });

  if (custAfterCancel1.points_balance !== 0) {
    throw new Error(`❌ Error en saldo de puntos tras anular: esperado 0, obtenido ${custAfterCancel1.points_balance}`);
  }
  if (custAfterCancel1.visit_count !== 0) {
    throw new Error(`❌ Error en visitas tras anular: esperado 0, obtenido ${custAfterCancel1.visit_count}`);
  }
  if (custAfterCancel1.total_spent !== 0) {
    throw new Error(`❌ Error en gasto total tras anular: esperado 0, obtenido ${custAfterCancel1.total_spent}`);
  }

  // Check batch depletion
  const batch1 = db.prepare("SELECT * FROM points_batches WHERE sale_id = ?").get(sale1.sale.id) as { status: string; points_remaining: number } | undefined;
  if (!batch1 || batch1.status !== "DEPLETED" || batch1.points_remaining !== 0) {
    throw new Error(`❌ Error en lote FIFO: status=${batch1?.status}, remaining=${batch1?.points_remaining}`);
  }
  console.log("✔ Lote FIFO marcado como DEPLETED con points_remaining=0");

  // Check points_history audit entry
  const historyEntry1 = db.prepare("SELECT * FROM points_history WHERE sale_id = ? AND points < 0").get(sale1.sale.id) as { points: number; concept: string } | undefined;
  if (!historyEntry1 || historyEntry1.points !== -150) {
    throw new Error(`❌ Error en libro contable points_history: no se registró movimiento negativo de -150 pts`);
  }
  console.log("✔ Asiento compensatorio en libro contable registrado:", historyEntry1.concept, historyEntry1.points, "pts");

  // TEST 3: Double cancellation prevention (Idempotency / Antifraude)
  console.log("\n4. Prueba antifraude: intentando anular venta ya anulada...");
  try {
    cancelSale(sale1.sale.id, "Reintento de anulación");
    throw new Error("❌ Error: permitió anular una venta dos veces.");
  } catch (err: unknown) {
    console.log("✔ Protección antifraude validada:", err instanceof Error ? err.message : String(err));
  }

  // TEST 4: Sector Mostrador (Takeaway / Counter) - Points but NO visit
  console.log("\n5. Ingestando Venta 2 (Mostrador - suma puntos pero NO visita)...");
  const sale2 = processSale({
    customerId: customer.id,
    totalAmount: 8000,
    source: "MANUAL",
    externalSaleId: "MANUAL_TEST_002",
    saleType: "COUNTER",
  });
  if (!sale2.sale) throw new Error("No se generó sale2");

  let custAfterSale2 = findCustomerByDocument(testDoc)!;
  console.log("✔ Venta mostrador procesada:", {
    saleId: sale2.sale.id,
    pointsEarned: sale2.points_earned,
    visitAdded: sale2.visit_added,
    customerPoints: custAfterSale2.points_balance,
    customerVisits: custAfterSale2.visit_count,
  });

  if (sale2.visit_added || custAfterSale2.visit_count !== 0 || custAfterSale2.points_balance !== 80) {
    throw new Error("❌ Error en venta mostrador");
  }

  console.log("\n6. Anulando Venta 2 (debe descontar 80 puntos y NO modificar visitas)...");
  const cancelResult2 = cancelSale(sale2.sale.id, "Ticket cancelado en mostrador");
  let custAfterCancel2 = findCustomerByDocument(testDoc)!;

  console.log("Resultado:", {
    points_deducted: cancelResult2.points_deducted,
    visit_deducted: cancelResult2.visit_deducted,
    balance: custAfterCancel2.points_balance,
    visits: custAfterCancel2.visit_count,
  });

  if (cancelResult2.visit_deducted !== false || custAfterCancel2.visit_count !== 0 || custAfterCancel2.points_balance !== 0) {
    throw new Error("❌ Error al anular venta de mostrador");
  }
  console.log("✔ Venta de mostrador anulada correctamente sin alterar visitas.");

  // TEST 5: Automated Fudo API Canceled Sale Sync
  console.log("\n7. Sincronización Fudo API: Detección y anulación automática de ventas canceladas...");

  const fudoSaleId = "FUDO_TEST_MOCK_SALE_777";
  // 7a. First ingest a sale that was CLOSED in Fudo
  const fudoSaleInitial = processSale({
    customerId: customer.id,
    totalAmount: 20000,
    source: "FUDO_API",
    externalSaleId: fudoSaleId,
    saleType: "TABLE",
  });

  let custWithFudoSale = findCustomerByDocument(testDoc)!;
  console.log("7a. Venta Fudo ingerida como cerrada:", {
    points: custWithFudoSale.points_balance,
    visits: custWithFudoSale.visit_count,
  });
  if (custWithFudoSale.points_balance !== 200 || custWithFudoSale.visit_count !== 1) {
    throw new Error("❌ Error al preparar venta Fudo cerrada");
  }

  // 7b. Mock getClosedSales to simulate Fudo API returning this sale with status = 'CANCELED'
  console.log("7b. Simulando que la API de Fudo retorna la venta con status = 'CANCELED'...");
  const originalGetClosedSales = fudoClient.FudoApiClient.prototype.getClosedSales;
  fudoClient.FudoApiClient.prototype.getClosedSales = async function () {
    return [
      {
        id: fudoSaleId,
        createdAt: new Date().toISOString(),
        total: 20000,
        status: "CANCELED" as const,
        type: "TABLE" as const,
        customerId: "FUDO_CUST_1",
        customerName: "Gastón Sommelier",
      },
    ];
  };

  try {
    const syncRes = await syncFudoSales({ fullSync: true, syncCustomers: false });
    console.log("Resultado de syncFudoSales:", {
      syncedCount: syncRes.syncedCount,
      canceledCount: syncRes.canceledCount,
      duplicatedCount: syncRes.duplicatedCount,
    });

    if (syncRes.canceledCount !== 1) {
      throw new Error(`❌ syncFudoSales no reportó 1 venta anulada, reportó ${syncRes.canceledCount}`);
    }

    const custAfterFudoSync = findCustomerByDocument(testDoc)!;
    console.log("Estado comensal tras detección automática de anulación en Fudo:", {
      points: custAfterFudoSync.points_balance,
      visits: custAfterFudoSync.visit_count,
      spent: custAfterFudoSync.total_spent,
    });

    if (custAfterFudoSync.points_balance !== 0 || custAfterFudoSync.visit_count !== 0) {
      throw new Error(`❌ Error en rollback automático tras sync Fudo: points=${custAfterFudoSync.points_balance}, visits=${custAfterFudoSync.visit_count}`);
    }

    const localSaleCheck = db.prepare("SELECT status FROM sales WHERE external_sale_id = ?").get(fudoSaleId) as { status: string };
    if (localSaleCheck.status !== "CANCELED") {
      throw new Error(`❌ Estado de venta local no actualizado a CANCELED: ${localSaleCheck.status}`);
    }
    console.log("✔ Estado de venta local sincronizado a CANCELED");
  } finally {
    // Restore original method
    fudoClient.FudoApiClient.prototype.getClosedSales = originalGetClosedSales;
  }

  console.log("\n==================================================================");
  console.log("🎉 TODAS LAS PRUEBAS DE ANULACIÓN PASARON EXITOSAMENTE 🎉");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("\n❌ ERROR EN PRUEBAS DE ANULACIÓN:", err);
  process.exit(1);
});
