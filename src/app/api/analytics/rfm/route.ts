import { NextRequest, NextResponse } from "next/server";
import { getRfmSegmentationReport } from "@/lib/db/analytics-repo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cmvParam = searchParams.get("cmv");
    const cmvPercentage = cmvParam ? parseFloat(cmvParam) : 32;

    const report = getRfmSegmentationReport(cmvPercentage);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error in GET /api/analytics/rfm:", error);
    return NextResponse.json(
      { success: false, error: "Error al calcular la segmentación RFM" },
      { status: 500 }
    );
  }
}
