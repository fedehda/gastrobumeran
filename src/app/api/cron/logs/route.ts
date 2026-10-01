import { NextResponse } from "next/server";
import { getCronLogs } from "@/lib/db/cron-repo";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const logs = getCronLogs(limit);
    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener bitácora de crons";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
