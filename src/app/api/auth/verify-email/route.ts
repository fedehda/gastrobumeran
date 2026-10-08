import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/db/restaurant-repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "El token de verificación es obligatorio." },
        { status: 400 }
      );
    }

    const result = verifyEmailToken(token.trim());
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Token inválido o expirado." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant: result.restaurant,
      message: "¡Correo electrónico verificado exitosamente! Tu restaurante está activo en modo de prueba Demo.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error durante la verificación de correo";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token de verificación no proporcionado." },
        { status: 400 }
      );
    }

    const result = verifyEmailToken(token.trim());
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Token inválido o expirado." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant: result.restaurant,
      message: "¡Correo electrónico verificado con éxito!",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error durante la verificación de correo";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
