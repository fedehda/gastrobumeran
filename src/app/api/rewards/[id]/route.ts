import { NextResponse } from "next/server";
import { getRewardById, updateReward, deleteReward } from "@/lib/db/settings-repo";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const rewardId = Number(params.id);
    const reward = getRewardById(rewardId);

    if (!reward) {
      return NextResponse.json({ success: false, error: "Recompensa no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, reward });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener recompensa";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const rewardId = Number(params.id);
    const body = await req.json();

    const updated = updateReward(rewardId, {
      name: body.name,
      reward_type: body.reward_type,
      requirement_value: body.requirement_value !== undefined ? Number(body.requirement_value) : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
      description: body.description,
    });

    return NextResponse.json({ success: true, reward: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar recompensa";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const rewardId = Number(params.id);

    const deleted = deleteReward(rewardId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Recompensa no encontrada o no se pudo eliminar" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Recompensa eliminada con éxito." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar recompensa";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
