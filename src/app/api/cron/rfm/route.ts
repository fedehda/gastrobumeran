import { NextResponse } from "next/server";
import { getRfmSegmentationReport } from "@/lib/db/analytics-repo";
import { logCronExecution } from "@/lib/db/cron-repo";

export async function POST() {
  const start = performance.now();
  try {
    const report = getRfmSegmentationReport();
    const duration = Math.round(performance.now() - start);

    const summary = `Segmentación RFM recalculada: ${report.total_analyzed_customers} comensales analizados (${report.quadrants.CHAMPIONS.customer_count} Champions, ${report.quadrants.PROMISING.customer_count} Prometedores, ${report.quadrants.AT_RISK.customer_count} En Riesgo, ${report.quadrants.DORMANT.customer_count} Dormidos). Pasivo contable: $${report.liability.real_cost_liability_ars.toLocaleString("es-AR")}.`;

    const log = logCronExecution({
      job_name: "RFM_CUSTOMER_INTELLIGENCE",
      status: "SUCCESS",
      summary,
      details: {
        totalAnalyzed: report.total_analyzed_customers,
        champions: report.quadrants.CHAMPIONS.customer_count,
        promising: report.quadrants.PROMISING.customer_count,
        atRisk: report.quadrants.AT_RISK.customer_count,
        dormant: report.quadrants.DORMANT.customer_count,
        realCostLiabilityArs: report.liability.real_cost_liability_ars,
      },
      duration_ms: duration,
    });

    return NextResponse.json({
      success: true,
      summary,
      log,
      report,
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

export async function GET() {
  // Support GET invocation for cron triggers
  return POST();
}
