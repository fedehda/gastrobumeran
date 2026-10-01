import { NextResponse } from "next/server";
import { getFudoConfig } from "@/lib/db/fudo-repo";
import { syncFudoSales } from "@/lib/fudo/sync";
import { logCronExecution } from "@/lib/db/cron-repo";

export async function POST(req: Request) {
  const startTime = Date.now();

  // Verify CRON_SECRET if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const url = new URL(req.url);
    const keyParam = url.searchParams.get("key");
    const isAuthorized = authHeader === `Bearer ${cronSecret}` || keyParam === cronSecret;

    if (!isAuthorized) {
      return NextResponse.json({ error: "No autorizado. Token de cron inválido." }, { status: 401 });
    }
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";

  const config = getFudoConfig();

  // If not enabled and not forced, skip
  if (!config.auto_sync_enabled && !force) {
    const summary = "Sincronización automática de Fudo omitida: Auto-sync desactivado en configuración.";
    logCronExecution({
      job_name: "FUDO_AUTO_SYNC",
      status: "WARNING",
      summary,
      duration_ms: Date.now() - startTime,
    });
    return NextResponse.json({ success: true, skipped: true, reason: summary });
  }

  // Check interval if not forced
  if (!force && config.last_sync_at) {
    const lastSyncTime = new Date(config.last_sync_at).getTime();
    const elapsedMinutes = (Date.now() - lastSyncTime) / (1000 * 60);

    if (elapsedMinutes < config.sync_interval_minutes) {
      const summary = `Sincronización omitida: solo pasaron ${Math.round(elapsedMinutes)}m de los ${config.sync_interval_minutes}m configurados.`;
      return NextResponse.json({ success: true, skipped: true, reason: summary });
    }
  }

  try {
    const result = await syncFudoSales();
    const durationMs = Date.now() - startTime;
    const summary = `Sincronización Fudo completada en ${durationMs}ms: ${result.syncedCount} ventas ingeridas (${result.totalPointsEarned} pts emitidos, $${result.totalAmountProcessed} ARS). ${result.newCustomersCount} comensales nuevos, ${result.duplicatedCount} duplicadas omitidas.`;

    logCronExecution({
      job_name: "FUDO_AUTO_SYNC",
      status: result.errors.length > 0 ? "WARNING" : "SUCCESS",
      summary,
      details: {
        totalRetrieved: result.totalRetrieved,
        syncedCount: result.syncedCount,
        duplicatedCount: result.duplicatedCount,
        newCustomersCount: result.newCustomersCount,
        totalPointsEarned: result.totalPointsEarned,
        totalAmountProcessed: result.totalAmountProcessed,
        errors: result.errors,
      },
      duration_ms: durationMs,
    });

    return NextResponse.json({
      success: true,
      durationMs,
      result,
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Error durante sincronización automática con Fudo";

    logCronExecution({
      job_name: "FUDO_AUTO_SYNC",
      status: "ERROR",
      summary: `Fallo en cron de sincronización Fudo: ${message}`,
      details: { error: message },
      duration_ms: durationMs,
    });

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
