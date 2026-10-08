import { NextRequest, NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/restaurant-repo";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, error: "Identificador de restaurante requerido." }, { status: 400 });
    }

    const resto = getRestaurantBySlug(slug.trim().toLowerCase());
    if (!resto) {
      return NextResponse.json({ success: false, error: "Restaurante no encontrado." }, { status: 404 });
    }

    if (resto.status === "SUSPENDED") {
      return NextResponse.json({ success: false, error: "El servicio de este restaurante se encuentra temporalmente suspendido." }, { status: 403 });
    }

    // Return only safe public brand info
    return NextResponse.json({
      success: true,
      restaurant: {
        id: resto.id,
        name: resto.name,
        slug: resto.slug,
        status: resto.status,
        logo_url: resto.logo_url,
        primary_color: resto.primary_color,
        accent_color: resto.accent_color,
        address: resto.address,
        city: resto.city,
        phone: resto.phone,
        whatsapp: resto.whatsapp,
        instagram: resto.instagram,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al obtener información del restaurante";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
