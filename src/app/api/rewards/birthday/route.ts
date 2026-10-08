import { NextRequest, NextResponse } from "next/server";
import { redeemBirthdayCourtesy } from "@/lib/loyalty/engine";
import { requireSession } from "@/lib/auth/require-session";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN", "OPERATOR"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;

    const body = await req.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "El ID de cliente es obligatorio." },
        { status: 400 }
      );
    }

    const result = redeemBirthdayCourtesy(customerId, restaurantId);

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al canjear cortesía de cumpleaños";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
