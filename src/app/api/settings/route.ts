import { NextRequest, NextResponse } from "next/server";
import { getLoyaltySettings, updateLoyaltySettings } from "@/lib/db/settings-repo";
import { getFudoConfig } from "@/lib/db/fudo-repo";
import { requireSession } from "@/lib/auth/require-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN", "OPERATOR"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;

    const settings = getLoyaltySettings(restaurantId);
    const fudoConfig = getFudoConfig(restaurantId);
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
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;

    const body = await req.json();
    const updated = updateLoyaltySettings(body, restaurantId);
    return NextResponse.json({ success: true, settings: updated, message: "Parámetros actualizados con éxito." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar configuración";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
