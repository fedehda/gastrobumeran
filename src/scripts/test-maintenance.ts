/**
 * TEST SUITE: MÓDULO DE MANTENIMIENTO Y RESETEO DE ENTORNO DE PRUEBAS
 * 
 * Uso: npx tsx src/scripts/test-maintenance.ts
 */

import { getTestDataCounts, resetTestData } from "../lib/db/maintenance-repo";
import { createCustomer } from "../lib/db/customer-repo";
import { processSale } from "../lib/loyalty/engine";
import { getDatabase } from "../lib/db/db";

async function runMaintenanceTests() {
  console.log("================================================================");
  console.log("🧪 INICIANDO PRUEBAS DEL MÓDULO DE RESETEO DE ENTORNO DE PRUEBAS");
  console.log("================================================================\n");

  // 1. Obtener conteos previos
  console.log("1. 📊 Verificando lectura de métricas de prueba:");
  const initialCounts = getTestDataCounts();
  console.log(`  ✓ Comensales actuales: ${initialCounts.customers}`);
  console.log(`  ✓ Ventas actuales: ${initialCounts.sales}`);
  console.log(`  ✓ Administradores preservados: ${initialCounts.preservedData.adminUsers}`);
  console.log(`  ✓ Catálogo de premios preservado: ${initialCounts.preservedData.rewards}`);
  console.log(`  ✓ Presets CSV preservados: ${initialCounts.preservedData.csvPresets}`);
  console.log(`  ✓ Integración Fudo: ${initialCounts.fudoStatus.isSandbox ? "Sandbox" : "API Real"} (Key: ${initialCounts.fudoStatus.maskedApiKey})`);

  if (initialCounts.preservedData.adminUsers === 0) {
    throw new Error("ALERTA: Se esperaba al menos 1 usuario administrador inicial.");
  }

  // 2. Insertar registros temporales para asegurar que la prueba tenga datos para purgar
  console.log("\n2. ➕ Generando comensal y venta temporal de prueba...");
  const tempDoc = "99887766";
  const tempCustomer = createCustomer({
    document_number: tempDoc,
    name: "Cliente Temporal Ensayo",
    phone: "+5491100009999",
  });

  processSale({
    customerId: tempCustomer.id,
    totalAmount: 25000,
    source: "MANUAL",
    externalSaleId: `TEST_TX_${Date.now()}`,
  });

  const midCounts = getTestDataCounts();
  console.log(`  ✓ Comensales tras inserción: ${midCounts.customers}`);
  console.log(`  ✓ Ventas tras inserción: ${midCounts.sales}`);
  if (midCounts.customers === 0 || midCounts.sales === 0) {
    throw new Error("Error: Los datos de prueba no se registraron en la base de datos.");
  }

  // 3. Ejecutar purga de prueba
  console.log("\n3. 🧹 Ejecutando resetTestData({ resetFudoSync: true, resetCronLogs: true })...");
  const purgeResult = resetTestData({
    resetFudoSync: true,
    resetCronLogs: true,
  });

  console.log("  ✓ Resultado de purga:", {
    clientes_eliminados: purgeResult.deleted.customers,
    ventas_eliminadas: purgeResult.deleted.sales,
    lotes_eliminados: purgeResult.deleted.pointsBatches,
    historial_eliminado: purgeResult.deleted.pointsHistory,
    crons_eliminados: purgeResult.deleted.cronLogs,
    fudo_reseteado: purgeResult.fudoSyncReset,
  });

  // 4. Verificaciones de integridad post-purga
  console.log("\n4. 🔍 Validando estado post-purga:");
  const postCounts = getTestDataCounts();
  console.log(`  • Comensales restantes: ${postCounts.customers} (esperado: 0)`);
  console.log(`  • Ventas restantes: ${postCounts.sales} (esperado: 0)`);
  console.log(`  • Lotes restantes: ${postCounts.pointsBatches} (esperado: 0)`);
  console.log(`  • Puntos activos: ${postCounts.activePoints} (esperado: 0)`);
  console.log(`  • Administradores: ${postCounts.preservedData.adminUsers} (debe ser >= 1)`);
  console.log(`  • Catálogo de premios: ${postCounts.preservedData.rewards} (debe ser >= 1)`);

  if (postCounts.customers !== 0) {
    throw new Error(`Fallo: Los comensales no quedaron en 0 (actual: ${postCounts.customers})`);
  }
  if (postCounts.sales !== 0) {
    throw new Error(`Fallo: Las ventas no quedaron en 0 (actual: ${postCounts.sales})`);
  }
  if (postCounts.preservedData.adminUsers === 0) {
    throw new Error("Fallo crítico: ¡Se eliminó el usuario administrador!");
  }
  if (postCounts.preservedData.rewards === 0) {
    throw new Error("Fallo: Se eliminaron los premios del catálogo.");
  }
  if (postCounts.fudoStatus.lastSyncAt !== null) {
    throw new Error("Fallo: La fecha de sincronización de Fudo no fue reiniciada a NULL.");
  }

  console.log("\n================================================================");
  console.log("🎉 ¡TODAS LAS PRUEBAS DE PURGA Y PRESERVACIÓN PASARON CON ÉXITO!");
  console.log("================================================================\n");
}

runMaintenanceTests().catch((err) => {
  console.error("❌ Falló el test de mantenimiento:", err);
  process.exit(1);
});
