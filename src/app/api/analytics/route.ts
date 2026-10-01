import { NextResponse } from "next/server";
import { getBackofficeAnalytics } from "@/lib/db/analytics-repo";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rangeParam = url.searchParams.get("range") as "7d" | "30d" | "90d" | "all" | null;
    const range = rangeParam === "7d" || rangeParam === "90d" || rangeParam === "all" ? rangeParam : "30d";

    const analytics = getBackofficeAnalytics(range);
    return NextResponse.json({ success: true, analytics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al calcular analíticas de backoffice";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
