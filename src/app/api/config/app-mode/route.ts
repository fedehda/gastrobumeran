import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config/app-mode";

export async function GET() {
  try {
    const config = getAppConfig();
    return NextResponse.json({
      success: true,
      ...config,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener configuración";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
