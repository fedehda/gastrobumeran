import { NextResponse } from "next/server";
import { getFudoConfig, updateFudoConfig } from "@/lib/db/fudo-repo";

export async function GET() {
  try {
    const config = getFudoConfig();
    return NextResponse.json(config);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al obtener configuración de Fudo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = updateFudoConfig({
      api_key: body.api_key,
      api_secret: body.api_secret,
      base_url: body.base_url,
      auth_url: body.auth_url,
      auto_sync_enabled: body.auto_sync_enabled,
      sync_interval_minutes: body.sync_interval_minutes,
    });
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al actualizar configuración de Fudo";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
