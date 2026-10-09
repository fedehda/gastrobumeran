import { NextResponse } from "next/server";
import { exportLocalDataForCloudSaas, getMigrationDiagnostics } from "@/lib/db/restaurant-repo";

export async function GET() {
  try {
    const bundle = exportLocalDataForCloudSaas();
    const filename = `gastrobumeran-cloud-export-${bundle.restaurant.slug}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/migration/export:", error);
    return NextResponse.json(
      { success: false, error: "Error al generar paquete de exportación para Cloud-SaaS" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const diagnostics = getMigrationDiagnostics();
    return NextResponse.json({
      success: true,
      diagnostics,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/migration/export:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar estado de migración" },
      { status: 500 }
    );
  }
}
