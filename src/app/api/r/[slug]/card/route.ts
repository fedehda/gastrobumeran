import { NextRequest, NextResponse } from "next/server";
import { getCustomerPortalData } from "@/lib/db/customer-repo";
import { getRestaurantBySlug, getRestaurantBranding } from "@/lib/db/restaurant-repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const resto = getRestaurantBySlug(slug);

    if (!resto) {
      return NextResponse.json(
        { success: false, error: `Restaurante no encontrado: "${slug}".` },
        { status: 404 }
      );
    }

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

    // Attach branding
    const branding = getRestaurantBranding();

    return NextResponse.json({
      success: true,
      restaurant: branding,
      card: {
        ...card,
        restaurant: branding,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/r/[slug]/card:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar la tarjeta digital" },
      { status: 500 }
    );
  }
}
