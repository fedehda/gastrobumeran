import { NextResponse } from "next/server";
import { authenticateWithPin, createSessionToken } from "@/lib/db/auth-repo";
import { getRestaurantBySlug, getRestaurantBranding } from "@/lib/db/restaurant-repo";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { pin, slug } = body;

    if (!pin || String(pin).trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "Ingresá un PIN numérico de 4 dígitos." },
        { status: 400 }
      );
    }

    const user = authenticateWithPin(String(pin).trim());
    if (!user) {
      return NextResponse.json(
        { success: false, error: "PIN incorrecto de operador." },
        { status: 401 }
      );
    }

    const resto = slug ? getRestaurantBySlug(String(slug).trim()) : null;
    const branding = getRestaurantBranding();

    const restaurant = resto || {
      id: branding.id,
      name: branding.name,
      slug: branding.slug,
      primary_color: branding.primary_color,
      logo_url: branding.logo_url,
    };

    const session = createSessionToken({
      ...user,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      restaurant_slug: restaurant.slug,
    });

    const response = NextResponse.json({
      success: true,
      user: session.user,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        primary_color: restaurant.primary_color,
        logo_url: restaurant.logo_url,
      },
      token: session.token,
    });

    response.cookies.set("gastrobumeran_session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error durante la autenticación de terminal";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
