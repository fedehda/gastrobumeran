import {
  createCustomer,
  findCustomerById,
  findCustomerByDocument,
  searchCustomers,
  updateCustomerLoyaltyEnrollment,
} from "../lib/db/customer-repo";
import { processSale } from "../lib/loyalty/engine";
import { getDatabase } from "../lib/db/db";

async function runEnrollmentTest() {
  console.log("==================================================================");
  console.log("🧪 TEST SUITE: GESTIÓN DE CLIENTES NO ADHERIDOS A FIDELIDAD");
  console.log("==================================================================\n");

  const db = getDatabase();
  const testDoc = "TEST_OPTIN_001";

  // Cleanup pre-existing test customer if any
  const existing = findCustomerByDocument(testDoc);
  if (existing) {
    db.prepare("DELETE FROM points_batches WHERE customer_id = ?").run(existing.id);
    db.prepare("DELETE FROM points_history WHERE customer_id = ?").run(existing.id);
    db.prepare("DELETE FROM sales WHERE customer_id = ?").run(existing.id);
    db.prepare("DELETE FROM customers WHERE id = ?").run(existing.id);
  }

  // 1. Crear comensal no adherido (simulando importación desde Fudo POS)
  console.log("1. Creando comensal con loyalty_enrolled = 0 (No Adherido)...");
  const unenrolledCust = createCustomer({
    document_number: testDoc,
    name: "Comensal Fudo Solo Facturación",
    phone: "+5491100001111",
    loyalty_enrolled: 0,
  });

  if (unenrolledCust.loyalty_enrolled !== 0) {
    throw new Error(`❌ loyalty_enrolled esperado 0, obtenido: ${unenrolledCust.loyalty_enrolled}`);
  }
  console.log("✓ Comensal creado exitosamente con loyalty_enrolled = 0");

  // 2. Procesar venta para comensal no adherido
  console.log("\n2. Procesando venta de $10.000 para comensal no adherido...");
  const saleResult1 = processSale({
    customerId: unenrolledCust.id,
    totalAmount: 10000,
    concept: "Consumo Salón (Sin Fidelidad)",
    saleType: "TABLE",
  });

  console.log("Resultado de venta 1:", {
    points_earned: saleResult1.points_earned,
    visit_added: saleResult1.visit_added,
    customer_points: saleResult1.customer.points_balance,
    customer_spent: saleResult1.customer.total_spent,
    customer_visits: saleResult1.customer.visit_count,
  });

  if (saleResult1.points_earned !== 0) {
    throw new Error(`❌ Esperado 0 puntos, obtenido: ${saleResult1.points_earned}`);
  }
  if (saleResult1.visit_added !== false) {
    throw new Error("❌ Esperado visit_added = false");
  }
  if (saleResult1.customer.points_balance !== 0) {
    throw new Error(`❌ Saldo de puntos esperado 0, obtenido: ${saleResult1.customer.points_balance}`);
  }
  if (saleResult1.customer.total_spent !== 10000) {
    throw new Error(`❌ Consumo acumulado esperado 10000, obtenido: ${saleResult1.customer.total_spent}`);
  }
  if (saleResult1.customer.visit_count !== 0) {
    throw new Error(`❌ Visitas esperadas 0, obtenido: ${saleResult1.customer.visit_count}`);
  }

  // Verificar que no se generó ningún lote FIFO en points_batches
  const batchCount = (
    db.prepare("SELECT COUNT(*) as count FROM points_batches WHERE customer_id = ?").get(unenrolledCust.id) as {
      count: number;
    }
  ).count;
  if (batchCount !== 0) {
    throw new Error(`❌ Se generaron ${batchCount} lotes FIFO para un cliente no adherido!`);
  }
  console.log("✓ Venta registrada correctamente: 0 puntos emitidos, 0 visitas selladas, 0 lotes FIFO creados.");

  // 3. Probar filtrado por pestañas en searchCustomers
  console.log("\n3. Probando filtrado searchCustomers (active vs unenrolled)...");
  const activeList = searchCustomers("", 50, "active");
  const unenrolledList = searchCustomers("", 50, "unenrolled");

  const foundInActive = activeList.some((c) => c.document_number === testDoc);
  const foundInUnenrolled = unenrolledList.some((c) => c.document_number === testDoc);

  console.log(`- Encontrado en 'active': ${foundInActive} (debe ser false)`);
  console.log(`- Encontrado en 'unenrolled': ${foundInUnenrolled} (debe ser true)`);

  if (foundInActive) {
    throw new Error("❌ El cliente no adherido apareció en la lista de activos!");
  }
  if (!foundInUnenrolled) {
    throw new Error("❌ El cliente no adherido NO apareció en la lista de no adheridos!");
  }
  console.log("✓ Filtrado por pestañas verificado correctamente.");

  // 4. Adherir comensal reconociendo compras pasadas (retroactive = true)
  console.log("\n4. Adhiriendo comensal con reconocimiento retroactivo de puntos...");
  const enrollResult = updateCustomerLoyaltyEnrollment(unenrolledCust.id, true, true);

  console.log("Resultado de adhesión:", {
    enrolled: enrollResult.customer.loyalty_enrolled,
    points_balance: enrollResult.customer.points_balance,
    retroPointsCredited: enrollResult.retroPointsCredited,
  });

  if (enrollResult.customer.loyalty_enrolled !== 1) {
    throw new Error("❌ loyalty_enrolled no se actualizó a 1");
  }
  if (enrollResult.retroPointsCredited <= 0) {
    throw new Error("❌ No se acreditaron puntos retroactivos por la venta previa de $10.000");
  }
  if (enrollResult.customer.points_balance !== enrollResult.retroPointsCredited) {
    throw new Error("❌ El saldo del comensal no coincide con los puntos retroactivos");
  }
  console.log(`✓ Adhesión exitosa: +${enrollResult.retroPointsCredited} puntos retroactivos acreditados.`);

  // 5. Procesar nueva venta para el comensal ahora adherido
  console.log("\n5. Procesando nueva venta de $5.000 para el comensal ahora activo...");
  const saleResult2 = processSale({
    customerId: unenrolledCust.id,
    totalAmount: 5000,
    concept: "Consumo Salón (Ya Adherido)",
    saleType: "TABLE",
  });

  console.log("Resultado de venta 2:", {
    points_earned: saleResult2.points_earned,
    visit_added: saleResult2.visit_added,
    new_balance: saleResult2.customer.points_balance,
    new_visits: saleResult2.customer.visit_count,
  });

  if (saleResult2.points_earned <= 0) {
    throw new Error("❌ La venta no generó puntos para el cliente activo");
  }
  if (saleResult2.visit_added !== true) {
    throw new Error("❌ No se sumó la primera visita para el cliente activo");
  }
  console.log("✓ El cliente ahora acumula puntos y visitas con normalidad.");

  // 6. Pausar / Desactivar fidelidad
  console.log("\n6. Pausando fidelidad del comensal (dar de baja de puntos)...");
  const deactivateResult = updateCustomerLoyaltyEnrollment(unenrolledCust.id, false);
  if (deactivateResult.customer.loyalty_enrolled !== 0) {
    throw new Error("❌ No se desactivó la fidelidad correctamente");
  }
  console.log("✓ Fidelidad pausada correctamente (loyalty_enrolled = 0).");

  // Limpieza final
  db.prepare("DELETE FROM points_batches WHERE customer_id = ?").run(unenrolledCust.id);
  db.prepare("DELETE FROM points_history WHERE customer_id = ?").run(unenrolledCust.id);
  db.prepare("DELETE FROM sales WHERE customer_id = ?").run(unenrolledCust.id);
  db.prepare("DELETE FROM customers WHERE id = ?").run(unenrolledCust.id);

  console.log("\n==================================================================");
  console.log("🎉 TODAS LAS PRUEBAS DE OPT-IN / NO ADHERIDOS PASARON CON ÉXITO 🎉");
  console.log("==================================================================");
}

runEnrollmentTest().catch((err) => {
  console.error("\n❌ Error en prueba:", err);
  process.exit(1);
});
