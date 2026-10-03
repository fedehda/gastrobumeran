import { NextResponse } from "next/server";
import { toggleCampaignActive } from "@/lib/db/campaign-repo";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    let isActive: boolean | undefined = undefined;

    try {
      const body = await req.json();
      if (body && typeof body.is_active === "boolean") {
        isActive = body.is_active;
      }
    } catch {
      // Body is optional; if omitted, toggleCampaignActive will invert current state
    }

    const updated = toggleCampaignActive(params.id, isActive);
    return NextResponse.json({ success: true, campaign: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cambiar estado de la campaña";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
