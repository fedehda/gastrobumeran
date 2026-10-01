import { NextRequest, NextResponse } from "next/server";
import { getAllPresets, savePreset } from "@/lib/db/presets-repo";

export async function GET() {
  try {
    const presets = getAllPresets();
    return NextResponse.json({ success: true, presets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener presets";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { system_name, mapping_config, delimiter } = body;

    if (!system_name || !mapping_config) {
      return NextResponse.json(
        { success: false, error: "El nombre del sistema y la configuración de mapeo son obligatorios." },
        { status: 400 }
      );
    }

    const saved = savePreset(system_name, mapping_config, delimiter || ";");

    return NextResponse.json({
      success: true,
      preset: saved,
      message: `Preset "${system_name}" guardado exitosamente.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al guardar preset";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
