import { NextResponse } from "next/server";
import { authenticateWithPin, createSessionToken } from "@/lib/db/auth-repo";
import { getRestaurantBySlug, getRestaurantById } from "@/lib/db/restaurant-repo";
import { isOfflineMode, getDefaultRestaurantId } from "@/lib/config/app-mode";
import { buildRateLimitKey, checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/db/rate-limiter";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pin, slug, restaurantId } = body;

    if (!pin || String(pin).trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "Ingresá un PIN numérico de 4 dígitos." },
        { status: 400 }
      );
    }

    let targetResto = null;
    if (slug) {
      targetResto = getRestaurantBySlug(String(slug).trim());
    } else if (restaurantId) {
      targetResto = getRestaurantById(String(restaurantId).trim());
    }

    if (!targetResto && isOfflineMode()) {
      targetResto = getRestaurantById(getDefaultRestaurantId());
    }

    if (!targetResto) {
      return NextResponse.json(
        { success: false, error: "Restaurante no identificado o enlace inválido." },
        { status: 404 }
      );
    }

    const clientIp = getClientIp(req);
    const key = buildRateLimitKey(clientIp, "pin", `terminal-${targetResto.id}`);

    const rateCheck = checkRateLimit(key);
    if (rateCheck.isLocked) {
      const minutes = Math.max(1, Math.ceil(rateCheck.retryAfterSeconds / 60));
      return NextResponse.json(
        {
          success: false,
          error: `Terminal bloqueada temporalmente por seguridad. Reintentá en ${minutes} min.`,
          isLocked: true,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const user = authenticateWithPin(String(pin).trim(), targetResto.id);
    if (!user) {
      const fail = recordFailedAttempt(key);
      return NextResponse.json(
        {
          success: false,
          error: `PIN inválido para ${targetResto.name}. Restan ${fail.remainingAttempts} intentos.`,
          remainingAttempts: fail.remainingAttempts,
        },
        { status: 401 }
      );
    }

    resetRateLimit(key);
    const session = createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user: session.user,
      restaurant: {
        id: targetResto.id,
        name: targetResto.name,
        slug: targetResto.slug,
        primary_color: targetResto.primary_color,
        logo_url: targetResto.logo_url,
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
