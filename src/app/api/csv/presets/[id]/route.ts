import { NextRequest, NextResponse } from "next/server";
import { getPresetById, deletePreset } from "@/lib/db/presets-repo";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const preset = getPresetById(Number(id));

    if (!preset) {
      return NextResponse.json({ success: false, error: "Preset no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, preset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener preset";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = deletePreset(Number(id));

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Preset no encontrado para eliminar." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Preset eliminado con éxito." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar preset";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
