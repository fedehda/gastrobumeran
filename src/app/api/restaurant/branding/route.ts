import { NextRequest, NextResponse } from "next/server";
import { getRestaurantBranding, updateLocalRestaurant, getMigrationDiagnostics } from "@/lib/db/restaurant-repo";

export async function GET() {
  try {
    const branding = getRestaurantBranding();
    const diagnostics = getMigrationDiagnostics();
    return NextResponse.json({
      success: true,
      branding,
      diagnostics,
    });
  } catch (error) {
    console.error("Error in GET /api/restaurant/branding:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener la configuración de marca del restaurante" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const updated = updateLocalRestaurant({
      name: body.name,
      slug: body.slug,
      legal_name: body.legal_name,
      cuit: body.cuit,
      logo_url: body.logo_url,
      primary_color: body.primary_color,
      secondary_color: body.secondary_color,
      accent_color: body.accent_color,
      currency_symbol: body.currency_symbol,
      stamp_icon: body.stamp_icon,
      card_slogan: body.card_slogan,
      address: body.address,
      city: body.city,
      phone: body.phone,
      whatsapp: body.whatsapp,
      instagram: body.instagram,
    });

    return NextResponse.json({
      success: true,
      message: "Personalización de tarjeta y datos del local guardados con éxito.",
      restaurant: updated,
      branding: getRestaurantBranding(),
    });
  } catch (error) {
    console.error("Error in PUT /api/restaurant/branding:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar la configuración de marca" },
      { status: 500 }
    );
  }
}
