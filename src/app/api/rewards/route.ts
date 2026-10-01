import { NextResponse } from "next/server";
import { getActiveRewards, getAllRewards, createReward } from "@/lib/db/settings-repo";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const includeAll = url.searchParams.get("all") === "true";
    const rewards = includeAll ? getAllRewards() : getActiveRewards();
    return NextResponse.json({ success: true, rewards });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener recompensas";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, reward_type, requirement_value, is_active, description } = body;

    if (!name || !reward_type || requirement_value === undefined) {
      return NextResponse.json(
        { success: false, error: "Nombre, tipo de recompensa y valor de requerimiento son obligatorios." },
        { status: 400 }
      );
    }

    const created = createReward({
      name,
      reward_type,
      requirement_value: Number(requirement_value),
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      description,
    });

    return NextResponse.json({ success: true, reward: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear recompensa";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
