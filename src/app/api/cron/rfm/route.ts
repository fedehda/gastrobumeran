import { NextResponse } from "next/server";
import { getRfmSegmentationReport } from "@/lib/db/analytics-repo";
import { logCronExecution } from "@/lib/db/cron-repo";
import { getAllRestaurants, getRestaurantById } from "@/lib/db/restaurant-repo";

export async function POST(req: Request) {
  const start = performance.now();
  const url = new URL(req.url);
  const targetRestaurantId = url.searchParams.get("restaurantId") || url.searchParams.get("resto");

  try {
    let restaurantsToProcess: Array<{ id: string; name: string }> = [];
    if (targetRestaurantId) {
      const resto = getRestaurantById(targetRestaurantId);
      if (!resto) {
        return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
      }
      restaurantsToProcess = [{ id: resto.id, name: resto.name }];
    } else {
      restaurantsToProcess = getAllRestaurants()
        .filter((r) => r.status === "ACTIVE" || r.status === "TRIAL_DEMO")
        .map((r) => ({ id: r.id, name: r.name }));
    }

    const summaries: string[] = [];

    for (const resto of restaurantsToProcess) {
      const report = getRfmSegmentationReport(32, resto.id);
      const summary = `[${resto.name}] RFM recalculado: ${report.total_analyzed_customers} comensales analizados (${report.quadrants.CHAMPIONS.customer_count} Champions, ${report.quadrants.PROMISING.customer_count} Prometedores, ${report.quadrants.AT_RISK.customer_count} En Riesgo, ${report.quadrants.DORMANT.customer_count} Dormidos). Pasivo: $${report.liability.real_cost_liability_ars.toLocaleString("es-AR")}.`;

      logCronExecution(
        {
          job_name: "RFM_CUSTOMER_INTELLIGENCE",
          status: "SUCCESS",
          summary,
          details: {
            restaurantId: resto.id,
            totalAnalyzed: report.total_analyzed_customers,
            champions: report.quadrants.CHAMPIONS.customer_count,
            promising: report.quadrants.PROMISING.customer_count,
            atRisk: report.quadrants.AT_RISK.customer_count,
            dormant: report.quadrants.DORMANT.customer_count,
            realCostLiabilityArs: report.liability.real_cost_liability_ars,
          },
          duration_ms: Math.round(performance.now() - start),
        },
        resto.id
      );

      summaries.push(summary);
    }

    const duration = Math.round(performance.now() - start);
    return NextResponse.json({
      success: true,
      processedCount: restaurantsToProcess.length,
      summaries,
      durationMs: duration,
    });
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    const msg = error instanceof Error ? error.message : "Error durante recálculo RFM";

    logCronExecution({
      job_name: "RFM_CUSTOMER_INTELLIGENCE",
      status: "ERROR",
      summary: `Fallo en recálculo RFM: ${msg}`,
      duration_ms: duration,
    });

    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Support GET invocation for cron triggers
  return POST(req);
}
