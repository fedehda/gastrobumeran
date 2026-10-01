/**
 * SCRIPT CLI: RESETEO SEGURO DE ENTORNO DE PRUEBAS
 * 
 * Uso: npx tsx src/scripts/reset-test-data.ts
 * 
 * Purga de forma atómica:
 * - Comensales de prueba (customers)
 * - Ventas (sales)
 * - Lotes FIFO (points_batches)
 * - Movimientos de bitácora (points_history)
 * - Bitácora de crons (cron_logs)
 * - Reinicia la fecha de sincronización de Fudo (fudo_config.last_sync_at = NULL)
 * 
 * PRESERVA 100% INTACTOS:
 * - Usuarios administradores y credenciales (admin_users)
 * - Reglas de fidelización globales (loyalty_settings)
 * - Catálogo de premios y cortesías (loyalty_rewards)
 * - Presets de importación CSV (csv_mapping_presets)
 * - Credenciales API de Fudo (fudo_config.api_key / api_secret)
 */

import { getTestDataCounts, resetTestData } from "../lib/db/maintenance-repo";

async function main() {
  console.log("================================================================");
  console.log("🧹 INICIANDO SCRIPT DE RESETEO DE ENTORNO DE PRUEBA");
  console.log("================================================================\n");

  const initial = getTestDataCounts();
  console.log("📊 Estado previo de la base de datos:");
  console.log(`  • Comensales: ${initial.customers}`);
  console.log(`  • Ventas: ${initial.sales}`);
  console.log(`  • Lotes FIFO: ${initial.pointsBatches}`);
  console.log(`  • Puntos en circulación: ${initial.activePoints.toLocaleString()} pts`);
  console.log(`  • Bitácora histórica: ${initial.pointsHistory + initial.cronLogs} registros\n`);

  console.log("🔒 Tablas preservadas:");
  console.log(`  • Administradores: ${initial.preservedData.adminUsers}`);
  console.log(`  • Catálogo de premios: ${initial.preservedData.rewards}`);
  console.log(`  • Presets CSV: ${initial.preservedData.csvPresets}`);
  console.log(`  • Reglas de fidelización: ${initial.preservedData.hasLoyaltySettings ? "Configuradas" : "Por defecto"}\n`);

  console.log("⚡ Ejecutando purga quirúrgica atómica...");
  const result = resetTestData({
    resetFudoSync: true,
    resetCronLogs: true,
  });

  console.log("\n✅ ¡Purga completada con éxito!");
  console.log(`  • Comensales eliminados: ${result.deleted.customers}`);
  console.log(`  • Ventas eliminadas: ${result.deleted.sales}`);
  console.log(`  • Lotes FIFO eliminados: ${result.deleted.pointsBatches}`);
  console.log(`  • Historial eliminado: ${result.deleted.pointsHistory}`);
  console.log(`  • Logs de cron eliminados: ${result.deleted.cronLogs}`);
  console.log(`  • Fudo sync reseteado a cero: ${result.fudoSyncReset ? "SÍ" : "NO"}`);

  const post = getTestDataCounts();
  console.log("\n🎯 Verificación posterior:");
  console.log(`  • Comensales restantes: ${post.customers}`);
  console.log(`  • Ventas restantes: ${post.sales}`);
  console.log(`  • Lotes restantes: ${post.pointsBatches}`);
  console.log(`  • Administradores preservados: ${post.preservedData.adminUsers}`);
  console.log(`  • Premios preservados: ${post.preservedData.rewards}`);

  console.log("\n================================================================");
  console.log("🚀 La base de datos está 100% limpia y lista para el lanzamiento");
  console.log("================================================================\n");
}

main().catch((err) => {
  console.error("❌ Error al ejecutar el reseteo:", err);
  process.exit(1);
});
