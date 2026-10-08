import { NextResponse } from "next/server";
import { getFudoConfig } from "@/lib/db/fudo-repo";
import { syncFudoSales } from "@/lib/fudo/sync";
import { logCronExecution } from "@/lib/db/cron-repo";
import { getAllRestaurants, getRestaurantById } from "@/lib/db/restaurant-repo";

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
  const targetRestaurantId = url.searchParams.get("restaurantId") || url.searchParams.get("resto");

  // Determine list of restaurants to process
  let restaurantsToSync: Array<{ id: string; name: string }> = [];
  if (targetRestaurantId) {
    const resto = getRestaurantById(targetRestaurantId);
    if (!resto) {
      return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
    }
    restaurantsToSync = [{ id: resto.id, name: resto.name }];
  } else {
    restaurantsToSync = getAllRestaurants()
      .filter((r) => r.status === "ACTIVE" || r.status === "TRIAL_DEMO")
      .map((r) => ({ id: r.id, name: r.name }));
  }

  const results: Record<string, unknown>[] = [];
  let totalSynced = 0;
  let totalPoints = 0;

  for (const resto of restaurantsToSync) {
    const restoStart = Date.now();
    const config = getFudoConfig(resto.id);

    // If not enabled and not forced, skip this restaurant
    if (!config.auto_sync_enabled && !force) {
      continue;
    }

    // Check interval if not forced
    if (!force && config.last_sync_at) {
      const lastSyncTime = new Date(config.last_sync_at).getTime();
      const elapsedMinutes = (Date.now() - lastSyncTime) / (1000 * 60);

      if (elapsedMinutes < config.sync_interval_minutes) {
        continue;
      }
    }

    try {
      const result = await syncFudoSales(undefined, resto.id);
      const durationMs = Date.now() - restoStart;
      const summary = `[${resto.name}] Sincronización Fudo completada en ${durationMs}ms: ${result.syncedCount} ventas ingeridas (${result.totalPointsEarned} pts emitidos).`;

      logCronExecution(
        {
          job_name: "FUDO_AUTO_SYNC",
          status: result.errors.length > 0 ? "WARNING" : "SUCCESS",
          summary,
          details: {
            restaurantId: resto.id,
            totalRetrieved: result.totalRetrieved,
            syncedCount: result.syncedCount,
            duplicatedCount: result.duplicatedCount,
            newCustomersCount: result.newCustomersCount,
            totalPointsEarned: result.totalPointsEarned,
            totalAmountProcessed: result.totalAmountProcessed,
            errors: result.errors,
          },
          duration_ms: durationMs,
        },
        resto.id
      );

      totalSynced += result.syncedCount;
      totalPoints += result.totalPointsEarned;
      results.push({ restaurantId: resto.id, name: resto.name, result });
    } catch (error: unknown) {
      const durationMs = Date.now() - restoStart;
      const message = error instanceof Error ? error.message : "Error durante sincronización";

      logCronExecution(
        {
          job_name: "FUDO_AUTO_SYNC",
          status: "ERROR",
          summary: `[${resto.name}] Fallo en sincronización Fudo: ${message}`,
          details: { error: message },
          duration_ms: durationMs,
        },
        resto.id
      );

      results.push({ restaurantId: resto.id, name: resto.name, error: message });
    }
  }

  const overallDuration = Date.now() - startTime;
  return NextResponse.json({
    success: true,
    restaurantsProcessed: restaurantsToSync.length,
    totalSyncedSales: totalSynced,
    totalPointsIssued: totalPoints,
    overallDurationMs: overallDuration,
    results,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
