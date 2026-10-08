import { NextRequest, NextResponse } from "next/server";
import { createRestaurant, isSlugAvailable, generateSlug, createEmailVerificationToken } from "@/lib/db/restaurant-repo";
import { createAdminUser, authenticateWithPassword, createSessionToken } from "@/lib/db/auth-repo";
import { isLegalEntityCuit } from "@/lib/validation/cuit";
import { buildRateLimitKey, checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/db/rate-limiter";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const key = buildRateLimitKey(clientIp, "password", "register-resto");
    const rateCheck = checkRateLimit(key);
    if (rateCheck.isLocked) {
      return NextResponse.json(
        { success: false, error: "Demasiadas solicitudes de registro. Por favor aguardá unos minutos." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug: requestedSlug,
      legal_name,
      cuit,
      city,
      address,
      phone,
      admin_name,
      email,
      password,
      pos_system,
    } = body;

    // Validations
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "El nombre del restaurante es obligatorio." }, { status: 400 });
    }

    if (!admin_name || typeof admin_name !== "string" || !admin_name.trim()) {
      return NextResponse.json({ success: false, error: "El nombre del administrador es obligatorio." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Ingresá un correo electrónico válido." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ success: false, error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }

    // Slug calculation & uniqueness
    let effectiveSlug = requestedSlug ? requestedSlug.trim().toLowerCase() : generateSlug(name);
    if (!isSlugAvailable(effectiveSlug)) {
      if (requestedSlug) {
        return NextResponse.json(
          { success: false, error: `El identificador '${effectiveSlug}' ya está en uso. Por favor elegí otro enlace.` },
          { status: 400 }
        );
      }
      effectiveSlug = generateSlug(name);
    }

    // 1. Create Restaurant with TRIAL_DEMO status
    const restaurant = createRestaurant({
      name: name.trim(),
      slug: effectiveSlug,
      legal_name: legal_name?.trim() || null,
      cuit: cuit?.trim() || null,
      city: city?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      status: "TRIAL_DEMO",
      max_customers: 50,
      max_sales: 100,
    });

    // 2. Create Restaurant Owner / Admin User
    const adminUser = createAdminUser({
      name: admin_name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      role: "OWNER",
      restaurant_id: restaurant.id,
    });

    // 3. Generate Email Verification Token
    const verificationToken = createEmailVerificationToken(restaurant.id, email.trim().toLowerCase());

    // 4. Log simulated email delivery (ready for future SMTP/Resend hook)
    const verificationUrl = `/verificar-email?token=${verificationToken}`;
    console.log(`[Email Dispatcher] Token de verificación para ${email}: ${verificationUrl}`);

    // Create session token for immediate seamless onboarding access
    const session = createSessionToken(adminUser);

    const response = NextResponse.json({
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        status: restaurant.status,
      },
      user: session.user,
      verificationToken,
      verificationUrl,
      message: "¡Restaurante registrado exitosamente en modo de prueba Demo! Te enviamos un enlace para verificar tu correo.",
    });

    response.cookies.set("gastrobumeran_session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    resetRateLimit(key);
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error durante el registro";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
