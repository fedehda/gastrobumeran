import { NextResponse } from "next/server";
import { getActiveCampaigns, findApplicableCampaigns, evaluateBestCampaign } from "@/lib/db/campaign-repo";
import { getLoyaltySettings } from "@/lib/db/settings-repo";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const amountStr = url.searchParams.get("amount");
    const sector = url.searchParams.get("sector") || undefined;
    const dateStr = url.searchParams.get("date");

    const date = dateStr ? new Date(dateStr) : new Date();
    const activeCampaigns = getActiveCampaigns();

    if (amountStr) {
      const amount = Number(amountStr);
      const settings = getLoyaltySettings();
      const basePoints = Math.floor(amount / Math.max(1, settings.points_earning_rate));
      const applicable = findApplicableCampaigns(date, amount, sector);
      const best = evaluateBestCampaign(date, amount, basePoints, sector);

      return NextResponse.json({
        success: true,
        campaigns: activeCampaigns,
        applicable_campaigns: applicable,
        best_campaign: best,
      });
    }

    return NextResponse.json({
      success: true,
      campaigns: activeCampaigns,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener campañas activas";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
