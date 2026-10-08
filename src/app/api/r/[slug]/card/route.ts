import { NextRequest, NextResponse } from "next/server";
import { getRestaurantBySlug, checkRestaurantQuota } from "@/lib/db/restaurant-repo";
import { getCustomerPortalData, createCustomer, findCustomerByDocument } from "@/lib/db/customer-repo";

export async function GET(
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

    const { searchParams } = new URL(req.url);
    const dni = searchParams.get("dni");
    const id = searchParams.get("id");
    const query = searchParams.get("query") || dni || id;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, error: "DNI o identificador requerido" },
        { status: 400 }
      );
    }

    const card = getCustomerPortalData(query, restaurant.id);
    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: `No encontramos una tarjeta de fidelización con ese documento en ${restaurant.name}.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      card,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logo_url: restaurant.logo_url,
        primary_color: restaurant.primary_color || "#F59E0B",
        accent_color: restaurant.accent_color || "#D97706",
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/r/[slug]/card:", error);
    const msg = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

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
    const { document_number, name, phone, email, birth_date } = body;

    if (!document_number || !name) {
      return NextResponse.json(
        { success: false, error: "El documento y el nombre son requeridos para la adhesión." },
        { status: 400 }
      );
    }

    const cleanDoc = String(document_number).trim();

    // Check if already registered in this restaurant
    const existing = findCustomerByDocument(cleanDoc, restaurant.id);
    if (existing) {
      const card = getCustomerPortalData(cleanDoc, restaurant.id);
      return NextResponse.json({
        success: true,
        alreadyExisted: true,
        card,
        message: "Ya te encontrabas adherido a este programa de fidelización.",
      });
    }

    // Check trial limits
    const quota = checkRestaurantQuota(restaurant.id);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: quota.reason || "El local ha alcanzado el límite de altas permitidas en su plan actual.",
        },
        { status: 403 }
      );
    }

    // Create customer in this restaurant
    createCustomer(
      {
        document_number: cleanDoc,
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : undefined,
        email: email ? String(email).trim() : undefined,
        birth_date: birth_date ? String(birth_date).trim() : undefined,
        loyalty_enrolled: 1,
      },
      restaurant.id
    );

    const card = getCustomerPortalData(cleanDoc, restaurant.id);

    return NextResponse.json({
      success: true,
      card,
      message: `¡Bienvenido al Club de Fidelidad de ${restaurant.name}!`,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/r/[slug]/card:", error);
    const msg = error instanceof Error ? error.message : "Error al enrolar cliente";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
