import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/db/auth-repo";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("gastrobumeran_session")?.value;

    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const token = cookieToken || bearerToken;

    if (!token) {
      return NextResponse.json({ success: true, authenticated: false, user: null });
    }

    const user = verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ success: true, authenticated: false, user: null });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al verificar sesión";
    return NextResponse.json({ success: false, authenticated: false, error: msg }, { status: 500 });
  }
}
