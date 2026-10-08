import { NextRequest, NextResponse } from "next/server";
import { processCsvBatch } from "@/lib/csv/batch-processor";
import { CsvFieldMapping } from "@/lib/csv/parser";
import { requireSession } from "@/lib/auth/require-session";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;

    const body = await req.json();
    const { csvContent, mapping, delimiter, presetName } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { success: false, error: "El contenido del archivo CSV es obligatorio." },
        { status: 400 }
      );
    }

    const fieldMapping = mapping as CsvFieldMapping;
    if (!fieldMapping?.document_number || !fieldMapping?.name || !fieldMapping?.total_amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Los campos DNI/Identificador, Nombre y Monto Total son de mapeo obligatorio.",
        },
        { status: 400 }
      );
    }

    const summary = processCsvBatch({
      csvContent,
      mapping: fieldMapping,
      delimiter,
      presetName,
      restaurantId,
    });

    return NextResponse.json({
      success: true,
      message: `Procesamiento completado: ${summary.successCount} ventas acreditadas, ${summary.duplicatedCount} duplicadas/omitidas y ${summary.errorCount} errores.`,
      summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error durante la importación del CSV";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
