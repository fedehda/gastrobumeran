import { NextRequest, NextResponse } from "next/server";
import { getLoyaltySettings, updateLoyaltySettings } from "@/lib/db/settings-repo";

export async function GET() {
  try {
    const settings = getLoyaltySettings();
    return NextResponse.json({ success: true, settings });
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
