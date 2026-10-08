import { NextRequest, NextResponse } from "next/server";
import { getRestaurantBySlug, createCustomerOtp, verifyCustomerOtp } from "@/lib/db/restaurant-repo";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const restaurant = getRestaurantBySlug(slug);

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, dni, phone, code, channel } = body;

    const identifier = dni || phone;
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: "El documento o teléfono es requerido" },
        { status: 400 }
      );
    }

    if (action === "REQUEST") {
      const selectedChannel = channel === "SMS" ? "SMS" : "WHATSAPP";
      const { otpCode, expiresAt } = createCustomerOtp(restaurant.id, identifier, selectedChannel);

      return NextResponse.json({
        success: true,
        message: `Código de seguridad enviado vía ${selectedChannel === "WHATSAPP" ? "WhatsApp" : "SMS"}.`,
        channel: selectedChannel,
        expiresAt,
        // En ambiente de prueba o demostración incluimos el código para feedback inmediato
        demoCode: otpCode,
      });
    }

    if (action === "VERIFY") {
      if (!code || typeof code !== "string" || !code.trim()) {
        return NextResponse.json(
          { success: false, error: "El código de verificación es requerido" },
          { status: 400 }
        );
      }

      const isValid = verifyCustomerOtp(restaurant.id, identifier, code);

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "El código ingresado es incorrecto o ha expirado." },
          { status: 400 }
        );
      }

      const cleanId = identifier.trim().replace(/[^0-9]/g, "");
      const sessionToken = `gb_otp_${restaurant.id}_${cleanId}_${Date.now()}`;

      return NextResponse.json({
        success: true,
        verified: true,
        sessionToken,
        message: "Identidad verificada exitosamente.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no soportada. Use 'REQUEST' o 'VERIFY'." },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Error in /api/r/[slug]/otp:", error);
    const msg = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
