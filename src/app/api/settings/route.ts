import { NextRequest, NextResponse } from "next/server";
import { getLoyaltySettings, updateLoyaltySettings } from "@/lib/db/settings-repo";
import { getFudoConfig } from "@/lib/db/fudo-repo";

export async function GET() {
  try {
    const settings = getLoyaltySettings();
    const fudoConfig = getFudoConfig();
    const rawKey = (fudoConfig.api_key || "").trim().toUpperCase();
    const isSandbox =
      !rawKey ||
      rawKey.startsWith("DEMO_") ||
      rawKey === "SANDBOX" ||
      (fudoConfig.api_secret || "").trim().toUpperCase().startsWith("DEMO_");

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        is_sandbox: isSandbox,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener configuración";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = updateLoyaltySettings(body);
    return NextResponse.json({ success: true, settings: updated, message: "Parámetros actualizados con éxito." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar configuración";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
