import { NextResponse } from "next/server";
import { getCampaignById, updateCampaign, deleteCampaign } from "@/lib/db/campaign-repo";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const campaign = getCampaignById(params.id);

    if (!campaign) {
      return NextResponse.json({ success: false, error: "Campaña no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener campaña";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await req.json();

    const updated = updateCampaign(params.id, {
      name: body.name,
      description: body.description,
      multiplier: body.multiplier !== undefined ? Number(body.multiplier) : undefined,
      bonus_points: body.bonus_points !== undefined ? Number(body.bonus_points) : undefined,
      days_of_week: Array.isArray(body.days_of_week) ? body.days_of_week : undefined,
      start_time: body.start_time,
      end_time: body.end_time,
      start_date: body.start_date,
      end_date: body.end_date,
      min_spend: body.min_spend !== undefined ? Number(body.min_spend) : undefined,
      applicable_sectors: body.applicable_sectors,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
      priority: body.priority !== undefined ? Number(body.priority) : undefined,
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar campaña";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const deleted = deleteCampaign(params.id);

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Campaña no encontrada o no se pudo eliminar" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Campaña eliminada con éxito." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar campaña";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
