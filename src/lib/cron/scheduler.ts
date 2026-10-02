import { getFudoConfig } from "@/lib/db/fudo-repo";
import { posGateway } from "@/lib/pos";
import { logCronExecution } from "@/lib/db/cron-repo";
import { runExpirationAudit } from "@/lib/loyalty/engine";

declare global {
  // eslint-disable-next-line no-var
  var __gb_cron_interval__: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __gb_cron_running__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __gb_last_expiration_check__: number | undefined;
}

const TICK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

export async function executeFudoAutoSyncTick(): Promise<void> {
  if (globalThis.__gb_cron_running__) {
    return;
  }

  globalThis.__gb_cron_running__ = true;

  try {
    const config = getFudoConfig();

    // 1. Check Fudo Auto Sync
    if (config.auto_sync_enabled) {
      const now = Date.now();
      const lastSyncTime = config.last_sync_at ? new Date(config.last_sync_at).getTime() : 0;
      const intervalMs = Math.max(1, config.sync_interval_minutes) * 60 * 1000;

      if (!config.last_sync_at || now - lastSyncTime >= intervalMs) {
        const startTime = Date.now();
        try {
          const result = await posGateway.syncSales({ provider: "FUDO", fullSync: false, syncCustomers: true });
          const durationMs = Date.now() - startTime;
          const summary = `Auto-Sync Fudo completado en ${durationMs}ms: ${result.syncedCount} ventas ingeridas (${result.totalPointsEarned} pts), ${result.newCustomersCount} comensales vinculados.`;

          logCronExecution({
            job_name: "FUDO_AUTO_SYNC",
            status: result.errors.length > 0 ? "WARNING" : "SUCCESS",
            summary,
            details: {
              totalRetrieved: result.totalRetrieved,
              syncedCount: result.syncedCount,
              duplicatedCount: result.duplicatedCount,
              unassignedCount: result.unassignedCount,
              newCustomersCount: result.newCustomersCount,
              totalPointsEarned: result.totalPointsEarned,
              totalAmountProcessed: result.totalAmountProcessed,
              errors: result.errors,
            },
            duration_ms: durationMs,
          });

          console.log(`[GastroBumeran AutoSync] ${summary}`);
        } catch (syncErr) {
          const durationMs = Date.now() - startTime;
          const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
          logCronExecution({
            job_name: "FUDO_AUTO_SYNC",
            status: "ERROR",
            summary: `Error en auto-sync Fudo: ${msg}`,
            duration_ms: durationMs,
          });
          console.error(`[GastroBumeran AutoSync] Error:`, msg);
        }
      }
    }

    // 2. Check Expiration Audit (runs once every 6 hours)
    const now = Date.now();
    const lastExp = globalThis.__gb_last_expiration_check__ || 0;
    const sixHoursMs = 6 * 60 * 60 * 1000;

    if (now - lastExp >= sixHoursMs) {
      globalThis.__gb_last_expiration_check__ = now;
      const startTime = Date.now();
      try {
        const expResult = runExpirationAudit();
        const durationMs = Date.now() - startTime;
        const totalExp = expResult.inactivityExpiredCount + expResult.batchesExpiredCount;
        logCronExecution({
          job_name: "EXPIRATION_AUDIT",
          status: "SUCCESS",
          summary: `Auditoría periódica: ${totalExp} vencimientos (${expResult.totalPointsExpired} pts depurados).`,
          duration_ms: durationMs,
        });
      } catch (expErr) {
        console.warn("[GastroBumeran Scheduler] Expiration audit error:", expErr);
      }
    }
  } catch (err) {
    console.error("[GastroBumeran Scheduler] Tick error:", err);
  } finally {
    globalThis.__gb_cron_running__ = false;
  }
}

export function startBackgroundScheduler(): void {
  if (globalThis.__gb_cron_interval__) {
    return; // Already initialized in this Node process
  }

  console.log("⏰ [GastroBumeran Scheduler] Iniciando daemon de sincronización periódica en segundo plano...");

  // Run first check after 10 seconds to allow server boot
  setTimeout(() => {
    executeFudoAutoSyncTick().catch(console.error);
  }, 10 * 1000);

  // Set recurring interval
  globalThis.__gb_cron_interval__ = setInterval(() => {
    executeFudoAutoSyncTick().catch(console.error);
  }, TICK_INTERVAL_MS);

  // Allow process to exit cleanly without being blocked by timer
  if (globalThis.__gb_cron_interval__.unref) {
    globalThis.__gb_cron_interval__.unref();
  }
}

export function stopBackgroundScheduler(): void {
  if (globalThis.__gb_cron_interval__) {
    clearInterval(globalThis.__gb_cron_interval__);
    globalThis.__gb_cron_interval__ = undefined;
    console.log("🛑 [GastroBumeran Scheduler] Daemon en segundo plano detenido.");
  }
}
