import { NextResponse } from "next/server";
import { getCronLogs } from "@/lib/db/cron-repo";
import { requireSession } from "@/lib/auth/require-session";

export async function GET(req: Request) {
  try {
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;

    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const logs = getCronLogs(limit, restaurantId);
    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener bitácora de crons";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
