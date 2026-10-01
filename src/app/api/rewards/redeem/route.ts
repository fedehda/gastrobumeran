import { NextRequest, NextResponse } from "next/server";
import { redeemReward } from "@/lib/loyalty/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, rewardId } = body;

    if (!customerId || !rewardId) {
      return NextResponse.json(
        { success: false, error: "Se requiere ID de cliente y ID de recompensa." },
        { status: 400 }
      );
    }

    const result = redeemReward(customerId, Number(rewardId));

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
