import { NextRequest, NextResponse } from "next/server";
import { redeemReward } from "@/lib/loyalty/engine";
import { requireSession } from "@/lib/auth/require-session";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN", "OPERATOR"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;

    const body = await req.json();
    const { customerId, rewardId } = body;

    if (!customerId || !rewardId) {
      return NextResponse.json(
        { success: false, error: "Se requiere ID de cliente y ID de recompensa." },
        { status: 400 }
      );
    }

    const result = redeemReward(customerId, Number(rewardId), restaurantId);

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al canjear recompensa";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
