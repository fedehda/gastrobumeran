import { FudoApiClient } from "../lib/fudo/client";
import { syncFudoSales } from "../lib/fudo/sync";
import { getFudoConfig } from "../lib/db/fudo-repo";
import { findCustomerByFudoId } from "../lib/db/customer-repo";

async function runFudoIntegrationTest() {
  console.log("==================================================");
  console.log("🚀 INICIANDO TEST DE INTEGRACIÓN: API FUDO (RF-01)");
  console.log("==================================================");

  // 1. Config & Client Check
  const config = getFudoConfig();
  console.log("Configuración actual Fudo:");
  console.log(`- Base URL: ${config.base_url}`);
  console.log(`- API Key: ${config.api_key}`);
  console.log(`- Auto Sync: ${config.auto_sync_enabled ? "Activo" : "Inactivo"}`);

  const client = new FudoApiClient(config);
  console.log(`- ¿Modo Sandbox?: ${client.isSandbox() ? "SÍ (Simulador activo)" : "NO (API Real)"}`);

  // 2. Test Authentication & Token
  console.log("\n🔑 1. Autenticación y Ciclo de Vida de Bearer Token:");
  const token = await client.authenticate(true);
  console.log(`✓ Bearer Token obtenido con éxito: ${token.slice(0, 30)}...`);
  const updatedCfg = getFudoConfig();
  console.log(`✓ Token guardado en DB con expiración: ${updatedCfg.token_expires_at}`);

  // 3. Test Sales Query
  console.log("\n📦 2. Consulta de Ventas Cerradas (status=CLOSED):");
  const sales = await client.getClosedSales();
  console.log(`✓ Ventas recuperadas de Fudo: ${sales.length}`);
  for (const s of sales) {
    console.log(`  - Venta ${s.id} | Tipo: ${s.type} | Total: $${s.total.toLocaleString("es-AR")} | Cliente: ${s.customerId || "Sin cliente"} | Fecha: ${s.createdAt}`);
  }

  // 4. Test Customer Directory
  console.log("\n👤 3. Consulta de Cliente Fudo (/customers/:id):");
  const cust1 = await client.getCustomer("FUDO-CUST-101");
  console.log(`✓ Cliente obtenido: ${cust1?.name} | DNI/Fiscal: ${cust1?.fiscalNumber} | Tel: ${cust1?.phone} | Email: ${cust1?.email}`);

  // 5. Test Synchronization Service
  console.log("\n⚡ 4. Ejecutando Sincronización Inicial (syncFudoSales):");
  const sync1 = await syncFudoSales({ fullSync: true });
  console.log("✓ Resultado Sincronización 1:");
  console.log(`  - Ventas recuperadas: ${sync1.totalRetrieved}`);
  console.log(`  - Sincronizadas con éxito: ${sync1.syncedCount}`);
  console.log(`  - Nuevos comensales dados de alta: ${sync1.newCustomersCount}`);
  console.log(`  - Duplicadas ignoradas: ${sync1.duplicatedCount}`);
  console.log(`  - Puntos acreditados al programa: ${sync1.totalPointsEarned}`);
  console.log(`  - Monto total facturado procesado: $${sync1.totalAmountProcessed.toLocaleString("es-AR")}`);
  if (sync1.errors.length > 0) {
    console.log("  - Advertencias/Errores:", sync1.errors);
  }

  // 6. Verify Customer Ingested in Loyalty DB
  console.log("\n🔍 5. Verificando estado del comensal en Core Engine:");
  const customer1 = findCustomerByFudoId("FUDO-CUST-101");
  if (customer1) {
    console.log(`✓ Comensal localizado: ${customer1.name} (DNI ${customer1.document_number})`);
    console.log(`  - Puntos acumulados: ${customer1.points_balance}`);
    console.log(`  - Visitas registradas: ${customer1.visit_count}`);
    console.log(`  - Total gastado: $${customer1.total_spent.toLocaleString("es-AR")}`);
    console.log(`  - Caducidad Timer 1 (Inactividad): ${customer1.points_expire_at}`);
  } else {
    throw new Error("No se encontró el comensal sincronizado en la base de datos.");
  }

  // 7. Test Idempotency (Second Sync)
  console.log("\n🛡️ 6. Test de Idempotencia Estricta (Segunda Sincronización):");
  const sync2 = await syncFudoSales({ fullSync: true });
  console.log("✓ Resultado Sincronización 2 (Repetida):");
  console.log(`  - Ventas sincronizadas nuevas: ${sync2.syncedCount} (esperado: 0)`);
  console.log(`  - Ventas duplicadas detectadas: ${sync2.duplicatedCount} (esperado: >= ${sync1.syncedCount})`);
  console.log(`  - Puntos adicionales acreditados: ${sync2.totalPointsEarned} (esperado: 0)`);

  if (sync2.syncedCount !== 0 || sync2.totalPointsEarned !== 0) {
    throw new Error("Fallo en la prueba de idempotencia: Se re-procesaron ventas duplicadas.");
  }

  console.log("\n🎉 ¡TODAS LAS PRUEBAS DE LA INTEGRACIÓN FUDO (RF-01) PASARON CON ÉXITO!");
  console.log("==================================================");
}

runFudoIntegrationTest().catch((err) => {
  console.error("❌ Error en test de integración Fudo:", err);
  process.exit(1);
});
