import { NextResponse } from "next/server";
import { authenticateWithPassword, authenticateWithPin, createSessionToken } from "@/lib/db/auth-repo";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, pin } = body;

    let user = null;

    if (pin) {
      user = authenticateWithPin(String(pin));
      if (!user) {
        return NextResponse.json({ success: false, error: "PIN de seguridad incorrecto." }, { status: 401 });
      }
    } else if (email && password) {
      user = authenticateWithPassword(String(email), String(password));
      if (!user) {
        return NextResponse.json({ success: false, error: "Email o contraseña incorrectos." }, { status: 401 });
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Debes ingresar Email/Contraseña o PIN numérico." },
        { status: 400 }
      );
    }

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
