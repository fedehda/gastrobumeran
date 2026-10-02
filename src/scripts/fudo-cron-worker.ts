import { getFudoConfig } from "../lib/db/fudo-repo";
import { syncFudoSales, syncFudoCustomers } from "../lib/fudo/sync";
import { logCronExecution } from "../lib/db/cron-repo";

async function runWorkerLoop() {
  console.log("==================================================================");
  console.log("🍔🔁 GASTROBUMERAN - FUDO POS BACKGROUND WORKER DAEMON");
  console.log("==================================================================");

  const initialConfig = getFudoConfig();
  console.log(`- API Key: ${initialConfig.api_key ? "Configurada" : "Sin configurar"}`);
  console.log(`- Auto-Sync Habilitado: ${initialConfig.auto_sync_enabled ? "SÍ" : "NO"}`);
  console.log(`- Intervalo: cada ${initialConfig.sync_interval_minutes} minutos`);
  console.log("\nPresiona Ctrl + C para detener el daemon.\n");

  const checkAndSync = async () => {
    try {
      const config = getFudoConfig();
      if (!config.auto_sync_enabled) {
        console.log(`[${new Date().toLocaleTimeString()}] Sincronización omitida: Auto-Sync desactivado en configuración.`);
        return;
      }

      const now = Date.now();
      const lastSyncTime = config.last_sync_at ? new Date(config.last_sync_at).getTime() : 0;
      const intervalMs = Math.max(1, config.sync_interval_minutes) * 60 * 1000;

      if (config.last_sync_at && now - lastSyncTime < intervalMs) {
        const remainingMin = Math.ceil((intervalMs - (now - lastSyncTime)) / 60000);
        console.log(`[${new Date().toLocaleTimeString()}] Esperando próximo ciclo (faltan ~${remainingMin} min)...`);
        return;
      }

      console.log(`\n[${new Date().toLocaleTimeString()}] 🚀 Ejecutando sincronización periódica con Fudo POS...`);
      const startTime = Date.now();

      // Sincronizar directorio y ventas
      const result = await syncFudoSales({ fullSync: false, syncCustomers: true });
      const durationMs = Date.now() - startTime;

      console.log(`[${new Date().toLocaleTimeString()}] ✓ Finalizado en ${durationMs}ms:`);
      console.log(`  - Ventas sincronizadas: ${result.syncedCount}`);
      console.log(`  - Ventas duplicadas omitidas: ${result.duplicatedCount}`);
      console.log(`  - Ventas sin cliente en Fudo: ${result.unassignedCount}`);
      console.log(`  - Comensales nuevos/actualizados: ${result.newCustomersCount}`);
      console.log(`  - Puntos emitidos: ${result.totalPointsEarned}`);
      console.log(`  - Monto facturado procesado: $${result.totalAmountProcessed}`);

      logCronExecution({
        job_name: "FUDO_AUTO_SYNC",
        status: result.errors.length > 0 ? "WARNING" : "SUCCESS",
        summary: `Worker CLI: ${result.syncedCount} ventas, ${result.newCustomersCount} clientes en ${durationMs}ms.`,
        duration_ms: durationMs,
      });
    } catch (err) {
      console.error(`[${new Date().toLocaleTimeString()}] ❌ Error en ciclo de sincronización:`, err);
    }
  };

  // Run initial check immediately
  await checkAndSync();

  // Poll every 30 seconds to check if interval is reached
  setInterval(checkAndSync, 30 * 1000);
}

runWorkerLoop().catch(console.error);
