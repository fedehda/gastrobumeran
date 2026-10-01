import { NextRequest, NextResponse } from "next/server";
import { getRfmSegmentationReport, generateRfmCsv } from "@/lib/db/analytics-repo";
import { RfmQuadrant } from "@/types/loyalty";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quadrant = (searchParams.get("quadrant") || "ALL").toUpperCase();

    const report = getRfmSegmentationReport();

    let filtered = report.customers;
    if (quadrant !== "ALL") {
      filtered = report.customers.filter((c) => c.quadrant === (quadrant as RfmQuadrant));
    }

    const csvContent = generateRfmCsv(filtered);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `gastrobumeran-rfm-${quadrant.toLowerCase()}-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/analytics/rfm/export:", error);
    return NextResponse.json(
      { success: false, error: "Error al exportar datos RFM en CSV" },
      { status: 500 }
    );
  }
}
