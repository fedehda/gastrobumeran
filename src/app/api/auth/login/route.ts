import { NextResponse } from "next/server";
import { authenticateWithPassword, authenticateWithPin, createSessionToken } from "@/lib/db/auth-repo";
import { getRestaurantBySlug } from "@/lib/db/restaurant-repo";
import { isOfflineMode, getDefaultRestaurantId } from "@/lib/config/app-mode";
import {
  buildRateLimitKey,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "@/lib/db/rate-limiter";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, pin, restaurantId, restaurantSlug } = body;

    let targetRestoId = restaurantId ? String(restaurantId).trim() : undefined;
    if (isOfflineMode()) {
      targetRestoId = getDefaultRestaurantId();
    } else if (!targetRestoId && restaurantSlug) {
      const resto = getRestaurantBySlug(String(restaurantSlug));
      if (resto) {
        targetRestoId = resto.id;
      }
    }

    const clientIp = getClientIp(req);
    const authType = pin ? "pin" : "password";
    const key = buildRateLimitKey(clientIp, authType, email || targetRestoId);

    // 1. Verificar si la IP / cuenta se encuentra bloqueada por rate limit
    const rateCheck = checkRateLimit(key);
    if (rateCheck.isLocked) {
      const minutes = Math.max(1, Math.ceil(rateCheck.retryAfterSeconds / 60));
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos fallidos. Acceso bloqueado temporalmente por seguridad. Reintenta en ${minutes} minuto${
            minutes > 1 ? "s" : ""
          }.`,
          isLocked: true,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    let user = null;

    if (pin) {
      user = authenticateWithPin(String(pin), targetRestoId);
      if (!user) {
        const failResult = recordFailedAttempt(key);
        if (failResult.delayMs > 0) {
          await new Promise((r) => setTimeout(r, failResult.delayMs));
        }

        if (failResult.isLocked) {
          const minutes = Math.max(1, Math.ceil(failResult.retryAfterSeconds / 60));
          return NextResponse.json(
            {
              success: false,
              error: `Demasiados intentos fallidos. Acceso bloqueado temporalmente por seguridad por ${minutes} minutos.`,
              isLocked: true,
              retryAfterSeconds: failResult.retryAfterSeconds,
            },
            { status: 429 }
          );
        }

        const warning =
          failResult.remainingAttempts === 1
            ? "¡Atención! Te queda 1 intento antes del bloqueo de seguridad."
            : `Te quedan ${failResult.remainingAttempts} intentos antes del bloqueo.`;

        return NextResponse.json(
          {
            success: false,
            error: `PIN de seguridad incorrecto. ${warning}`,
            remainingAttempts: failResult.remainingAttempts,
          },
          { status: 401 }
        );
      }
    } else if (email && password) {
      user = authenticateWithPassword(String(email), String(password), targetRestoId);
      if (!user) {
        const failResult = recordFailedAttempt(key);
        if (failResult.delayMs > 0) {
          await new Promise((r) => setTimeout(r, failResult.delayMs));
        }

        if (failResult.isLocked) {
          const minutes = Math.max(1, Math.ceil(failResult.retryAfterSeconds / 60));
          return NextResponse.json(
            {
              success: false,
              error: `Demasiados intentos fallidos. Acceso bloqueado temporalmente por seguridad por ${minutes} minutos.`,
              isLocked: true,
              retryAfterSeconds: failResult.retryAfterSeconds,
            },
            { status: 429 }
          );
        }

        const warning =
          failResult.remainingAttempts === 1
            ? "¡Atención! Te queda 1 intento antes del bloqueo de seguridad."
            : `Te quedan ${failResult.remainingAttempts} intentos antes del bloqueo.`;

        return NextResponse.json(
          {
            success: false,
            error: `Email o contraseña incorrectos. ${warning}`,
            remainingAttempts: failResult.remainingAttempts,
          },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Debes ingresar Email/Contraseña o PIN numérico." },
        { status: 400 }
      );
    }

    // Login exitoso: limpiar contador de intentos fallidos
    resetRateLimit(key);

    const session = createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user: session.user,
      token: session.token,
    });

    response.cookies.set("gastrobumeran_session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error durante el inicio de sesión";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
