import { NextResponse } from "next/server";
import { getCustomerMetrics } from "@/lib/db/customer-repo";

export async function GET() {
  try {
    const metrics = getCustomerMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener métricas";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
