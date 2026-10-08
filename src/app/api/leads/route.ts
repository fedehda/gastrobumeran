import { NextRequest, NextResponse } from "next/server";
import { createContactLead } from "@/lib/db/restaurant-repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, restaurant_name, branch_count, pos_system, phone, email, message } = body;

    if (!name || !restaurant_name || !phone || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Nombre, restaurante, teléfono y email son requeridos.",
        },
        { status: 400 }
      );
    }

    const lead = createContactLead({
      name: String(name).trim(),
      restaurant_name: String(restaurant_name).trim(),
      branch_count: branch_count ? Number(branch_count) : 1,
      pos_system: pos_system ? String(pos_system).trim() : undefined,
      phone: String(phone).trim(),
      email: String(email).trim().toLowerCase(),
      message: message ? String(message).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      lead,
      message: "¡Gracias por tu interés! Un asesor gastronómico se comunicará con vos a la brevedad.",
    });
  } catch (error: unknown) {
    console.error("Error in /api/leads:", error);
    const msg = error instanceof Error ? error.message : "Error al procesar solicitud de contacto";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
