import { NextResponse } from "next/server";
import { getAllCampaigns, getActiveCampaigns, createCampaign } from "@/lib/db/campaign-repo";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const includeAll = url.searchParams.get("all") === "true";
    const campaigns = includeAll ? getAllCampaigns() : getActiveCampaigns();
    return NextResponse.json({ success: true, campaigns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener campañas";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      multiplier,
      bonus_points,
      days_of_week,
      start_time,
      end_time,
      start_date,
      end_date,
      min_spend,
      applicable_sectors,
      is_active,
      priority,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre de la campaña es obligatorio." },
        { status: 400 }
      );
    }

    const created = createCampaign({
      name: name.trim(),
      description: description?.trim() || null,
      multiplier: multiplier !== undefined ? Number(multiplier) : 1.0,
      bonus_points: bonus_points !== undefined ? Number(bonus_points) : 0,
      days_of_week: Array.isArray(days_of_week) ? days_of_week : undefined,
      start_time: start_time || null,
      end_time: end_time || null,
      start_date: start_date || null,
      end_date: end_date || null,
      min_spend: min_spend !== undefined ? Number(min_spend) : 0,
      applicable_sectors: applicable_sectors || "ALL",
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      priority: priority !== undefined ? Number(priority) : 1,
    });

    return NextResponse.json({ success: true, campaign: created }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear campaña";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
