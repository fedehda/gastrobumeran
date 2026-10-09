import { NextRequest, NextResponse } from "next/server";
import { getRestaurantBySlug, getRestaurantBranding } from "@/lib/db/restaurant-repo";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const resto = getRestaurantBySlug(slug);

    if (!resto) {
      return NextResponse.json(
        { success: false, error: `Restaurante no encontrado con el identificador "${slug}".` },
        { status: 404 }
      );
    }

    const branding = getRestaurantBranding();

    return NextResponse.json({
      success: true,
      restaurant: branding,
    });
  } catch (error) {
    console.error("Error in GET /api/r/[slug]/info:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar los datos del restaurante." },
      { status: 500 }
    );
  }
}
