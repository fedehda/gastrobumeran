import { NextRequest, NextResponse } from "next/server";
import { createCustomerOtp, verifyCustomerOtp } from "@/lib/db/restaurant-repo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = body.identifier || body.dni || body.phone;
    const channel = body.channel === "SMS" ? "SMS" : "WHATSAPP";

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: "Identificador (DNI o Teléfono) requerido." },
        { status: 400 }
      );
    }

    const { otpCode, expiresAt } = createCustomerOtp(identifier, channel);

    return NextResponse.json({
      success: true,
      message: `Código de verificación enviado vía ${channel}.`,
      expiresAt,
      // For local development and demonstration, return demo code
      demoCode: otpCode,
    });
  } catch (error) {
    console.error("Error in POST /api/portal/otp:", error);
    return NextResponse.json(
      { success: false, error: "Error al generar código OTP." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = body.identifier || body.dni || body.phone;
    const code = body.code || body.otp;

    if (!identifier || !code) {
      return NextResponse.json(
        { success: false, error: "Identificador y código son requeridos." },
        { status: 400 }
      );
    }

    const isValid = verifyCustomerOtp(identifier, code);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Código incorrecto o vencido. Intentá nuevamente." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Identidad verificada exitosamente.",
    });
  } catch (error) {
    console.error("Error in PUT /api/portal/otp:", error);
    return NextResponse.json(
      { success: false, error: "Error al verificar código OTP." },
      { status: 500 }
    );
  }
}
