import { NextResponse } from "next/server";
import { toggleRewardStatus } from "@/lib/db/settings-repo";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const rewardId = Number(params.id);
    const body = await req.json();

    if (body.is_active === undefined) {
      return NextResponse.json({ success: false, error: "El campo is_active es obligatorio." }, { status: 400 });
    }

    const updated = toggleRewardStatus(rewardId, Boolean(body.is_active));
    return NextResponse.json({ success: true, reward: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al alternar estado de recompensa";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
