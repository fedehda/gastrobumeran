import { NextRequest, NextResponse } from "next/server";
import { getTestDataCounts, resetTestData } from "@/lib/db/maintenance-repo";
import { logCronExecution } from "@/lib/db/cron-repo";
import { requireSession } from "@/lib/auth/require-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req, { allowedRoles: ["PLATFORM_ADMIN", "ADMIN"] });
    if (!session.success) return session.response;

    const counts = getTestDataCounts();
    return NextResponse.json({
      success: true,
      counts,
    });
  } catch (error) {
    console.error("Error al obtener estadísticas de prueba:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al consultar estado de la base de datos",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireSession(req, { allowedRoles: ["PLATFORM_ADMIN", "ADMIN"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;
    const body = await req.json().catch(() => ({}));
    const { confirmation, resetFudoSync = true, resetCronLogs = true } = body;

    // Validación estricta de confirmación para evitar activaciones no intencionadas
    const normalizedConfirmation = String(confirmation || "").trim().toUpperCase();
    if (normalizedConfirmation !== "BORRAR" && normalizedConfirmation !== "BORRAR_DATOS_PRUEBA") {
      return NextResponse.json(
        {
          success: false,
          error: "Confirmación requerida. Debes escribir exactamente 'BORRAR' para proceder con la purga del entorno de pruebas.",
        },
        { status: 400 }
      );
    }

    const result = resetTestData({
      resetFudoSync: Boolean(resetFudoSync),
      resetCronLogs: Boolean(resetCronLogs),
    });

    // Registrar en bitácora de crons/auditoría
    logCronExecution({
      job_name: "TEST_DATA_PURGE",
      status: "SUCCESS",
      summary: `Purga de entorno de pruebas completada: ${result.deleted.customers} clientes, ${result.deleted.sales} ventas y ${result.deleted.pointsBatches} lotes eliminados.`,
      details: result as unknown as Record<string, unknown>,
      duration_ms: Date.now() - start,
    });

    return NextResponse.json({
      success: true,
      message: "Entorno de pruebas limpiado exitosamente. La plataforma está lista para operar.",
      result,
    });
  } catch (error) {
    console.error("Error al purgar datos de prueba:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al resetear datos de prueba",
      },
      { status: 500 }
    );
  }
}
