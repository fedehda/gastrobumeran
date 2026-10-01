import { NextRequest, NextResponse } from "next/server";
import { getCustomerPortalData } from "@/lib/db/customer-repo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dni = searchParams.get("dni");
    const id = searchParams.get("id");
    const query = searchParams.get("query") || dni || id;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, error: "Identificador (DNI o ID) es requerido" },
        { status: 400 }
      );
    }

    const card = getCustomerPortalData(query);
    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: "No encontramos una tarjeta de fidelización con ese documento o número.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error("Error in GET /api/portal/card:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar la tarjeta digital" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = body.identifier || body.dni || body.id;

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: "El DNI o identificador es requerido" },
        { status: 400 }
      );
    }

    const card = getCustomerPortalData(identifier);
    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: "No encontramos una tarjeta de fidelización con ese documento o número.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error("Error in POST /api/portal/card:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar la tarjeta digital" },
      { status: 500 }
    );
  }
}
