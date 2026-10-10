import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/db/auth-repo";
import { AdminRole, AdminUser } from "@/types/loyalty";
import { DEFAULT_RESTAURANT_ID, getRestaurantBySlug } from "@/lib/db/restaurant-repo";
import { isOfflineMode, getDefaultRestaurantId } from "@/lib/config/app-mode";

export interface SessionResult {
  user: AdminUser;
  restaurantId: string;
}

export type RequireSessionResponse =
  | { success: true; user: AdminUser; restaurantId: string }
  | { success: false; response: NextResponse };

export async function requireSession(
  req?: Request,
  options?: {
    allowedRoles?: AdminRole[];
    targetRestaurantId?: string;
    targetRestaurantSlug?: string;
  }
): Promise<RequireSessionResponse> {
  let token: string | null = null;

  // 1. Extract from Authorization header if request is provided
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  // 2. Extract from cookies if no bearer token
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("gastrobumeran_session")?.value || null;
    } catch {
      // If cookies() is not available (e.g. edge or test context), proceed
    }
  }

  if (!token) {
    if (isOfflineMode() && process.env.ALLOW_ANONYMOUS_OFFLINE === "true") {
      return {
        success: true,
        user: {
          id: "offline-local-user",
          restaurant_id: getDefaultRestaurantId(),
          name: "Operador Local",
          email: "caja@local",
          role: "ADMIN",
          created_at: new Date().toISOString(),
        },
        restaurantId: getDefaultRestaurantId(),
      };
    }

    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: "No autenticado. Se requiere iniciar sesión." },
        { status: 401 }
      ),
    };
  }

  const user = verifySessionToken(token);
  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: "Sesión inválida o expirada. Por favor vuelva a identificarse." },
        { status: 401 }
      ),
    };
  }

  // 3. Role check
  if (options?.allowedRoles && options.allowedRoles.length > 0) {
    const isAllowed =
      user.role === "PLATFORM_ADMIN" || options.allowedRoles.includes(user.role);
    if (!isAllowed) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: "Acceso denegado. Permisos insuficientes." },
          { status: 403 }
        ),
      };
    }
  }

  // 4. Resolve Restaurant Scope
  let targetRestoId = options?.targetRestaurantId;

  // Resolve slug to ID if provided
  if (!targetRestoId && options?.targetRestaurantSlug) {
    const resto = getRestaurantBySlug(options.targetRestaurantSlug);
    if (resto) {
      targetRestoId = resto.id;
    }
  }

  // Resolve from header or query param if req is provided
  if (!targetRestoId && req) {
    const headerResto = req.headers.get("x-restaurant-id");
    if (headerResto) {
      targetRestoId = headerResto.trim();
    } else {
      const url = new URL(req.url);
      const queryResto = url.searchParams.get("restaurantId");
      if (queryResto) {
        targetRestoId = queryResto.trim();
      }
    }
  }

  let effectiveRestaurantId = user.restaurant_id || DEFAULT_RESTAURANT_ID;

  if (isOfflineMode()) {
    // En Modo Local / Offline, fijar siempre de forma determinística al restaurant_id local
    effectiveRestaurantId = getDefaultRestaurantId();
  } else if (user.role === "PLATFORM_ADMIN") {
    // Platform admin can operate on any restaurant requested
    if (targetRestoId) {
      effectiveRestaurantId = targetRestoId;
    }
  } else {
    // Tenant Admin or Operator is locked to their assigned restaurant
    if (user.restaurant_id) {
      effectiveRestaurantId = user.restaurant_id;
      // If client tried to target a different restaurant, forbid it
      if (targetRestoId && targetRestoId !== user.restaurant_id) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, error: "No tienes permiso para operar sobre otro restaurante." },
            { status: 403 }
          ),
        };
      }
    }
  }

  return {
    success: true,
    user,
    restaurantId: effectiveRestaurantId,
  };
}
