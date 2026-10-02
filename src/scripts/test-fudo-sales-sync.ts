import { FudoApiClient } from "../lib/fudo/client";
import { syncFudoSales, syncFudoCustomers } from "../lib/fudo/sync";
import { findCustomerByDocument } from "../lib/db/customer-repo";

async function testEnhancedFudoSync() {
  console.log("==================================================");
  console.log("🧪 PROBANDO SINCRONIZACIÓN MEJORADA FUDO OPENAPI");
  console.log("==================================================");

  const client = new FudoApiClient();

  // 1. Test Customer Directory Fetch & Sync
  console.log("\n1. 👥 Sincronizando directorio de clientes de Fudo...");
  const custResult = await syncFudoCustomers(client);
  console.log("✓ Clientes Fudo procesados:", custResult);

  // 2. Test Customer Directory Retrieval
  const customers = await client.getCustomers();
  console.log(`✓ Clientes recuperados de Fudo: ${customers.length}`);
  if (customers.length > 0) {
    console.log(`  Ejemplo: ${customers[0].name} (DNI/VAT: ${customers[0].fiscalNumber}, Tel: ${customers[0].phone})`);
  }

  // 3. Test Sales Sync with OpenAPI parameters
  console.log("\n2. 📦 Sincronizando ventas cerradas con Fudo...");
  const salesResult = await syncFudoSales({ fullSync: false, syncCustomers: true });
  console.log("✓ Resultado Sincronización Ventas:");
  console.log(`  - Ventas recuperadas de Fudo: ${salesResult.totalRetrieved}`);
  console.log(`  - Ventas sincronizadas: ${salesResult.syncedCount}`);
  console.log(`  - Ventas duplicadas omitidas: ${salesResult.duplicatedCount}`);
  console.log(`  - Ventas sin cliente en Fudo: ${salesResult.unassignedCount}`);
  console.log(`  - Nuevos comensales dados de alta: ${salesResult.newCustomersCount}`);
  console.log(`  - Puntos emitidos: ${salesResult.totalPointsEarned}`);
  console.log(`  - Facturación procesada: $${salesResult.totalAmountProcessed}`);

  // 4. Verify linking in database
  const sampleCustomer = findCustomerByDocument("32111222");
  if (sampleCustomer) {
    console.log("\n3. 🔗 Verificación en base de datos local:");
    console.log(`  ✓ Comensal DNI 32111222: ${sampleCustomer.name}`);
    console.log(`  ✓ Fudo Customer ID vinculado: ${sampleCustomer.fudo_customer_id}`);
    console.log(`  ✓ Saldo de puntos: ${sampleCustomer.points_balance}`);
  }

  console.log("\n==================================================");
  console.log("🎉 PRUEBA DE SINCRONIZACIÓN COMPLETADA CON ÉXITO");
  console.log("==================================================");
}

testEnhancedFudoSync().catch((err) => {
  console.error("❌ Error en prueba:", err);
  process.exit(1);
});
