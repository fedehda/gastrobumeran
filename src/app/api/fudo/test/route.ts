import { NextResponse } from "next/server";
import { getFudoConfig } from "@/lib/db/fudo-repo";
import { FudoApiClient } from "@/lib/fudo/client";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const currentConfig = getFudoConfig();

    const configToTest = {
      ...currentConfig,
      api_key: body.api_key !== undefined ? body.api_key : currentConfig.api_key,
      api_secret: body.api_secret !== undefined ? body.api_secret : currentConfig.api_secret,
      base_url: body.base_url !== undefined ? body.base_url : currentConfig.base_url,
      auth_url: body.auth_url !== undefined ? body.auth_url : currentConfig.auth_url,
    };

    const client = new FudoApiClient(configToTest);
    const token = await client.authenticate(true);
    const isSandbox = client.isSandbox();

    return NextResponse.json({
      success: true,
      isSandbox,
      tokenPreview: token.slice(0, 16) + "...",
      expiresAt: configToTest.token_expires_at || new Date(Date.now() + 86400000).toISOString(),
      message: isSandbox
        ? "Conexión exitosa con el Simulador Sandbox de Fudo (Modo demostración activo)."
        : "Conexión exitosa autenticada contra la API Pública oficial de Fudo.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al autenticar con Fudo";
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 400 }
    );
  }
}
