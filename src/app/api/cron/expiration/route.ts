import { NextResponse } from "next/server";
import { runExpirationAudit } from "@/lib/loyalty/engine";
import { logCronExecution } from "@/lib/db/cron-repo";

export async function POST(req: Request) {
  const startTime = Date.now();

  // Verify CRON_SECRET if configured in environment
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

  try {
    const result = runExpirationAudit();
    const durationMs = Date.now() - startTime;
    const totalExpired = result.inactivityExpiredCount + result.batchesExpiredCount;
    const summary = `Auditoría dual ejecutada en ${durationMs}ms: ${totalExpired} vencimientos (${result.totalPointsExpired} pts depurados: ${result.inactivityPointsExpired} pts Timer 1 + ${result.batchesPointsExpired} pts Timer 2). ${result.day75Alerts.length} comensales en Alerta Día 75.`;

    logCronExecution({
      job_name: "EXPIRATION_AUDIT",
      status: "SUCCESS",
      summary,
      details: {
        inactivityExpiredCount: result.inactivityExpiredCount,
        inactivityPointsExpired: result.inactivityPointsExpired,
        batchesExpiredCount: result.batchesExpiredCount,
        batchesPointsExpired: result.batchesPointsExpired,
        totalPointsExpired: result.totalPointsExpired,
        day75AlertsCount: result.day75Alerts.length,
      },
      duration_ms: durationMs,
    });

    return NextResponse.json({
      success: true,
      message: summary,
      durationMs,
      result,
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Error al ejecutar auditoría de caducidad";

    logCronExecution({
      job_name: "EXPIRATION_AUDIT",
      status: "ERROR",
      summary: `Fallo en auditoría de caducidad: ${message}`,
      details: { error: message },
      duration_ms: durationMs,
    });

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Allow GET for simple ping / webhook calls
export async function GET(req: Request) {
  return POST(req);
}
