import { NextRequest, NextResponse } from "next/server";
import { getCustomerMetrics } from "@/lib/db/customer-repo";
import { requireSession } from "@/lib/auth/require-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN", "OPERATOR", "CASHIER"] });
    const restaurantId = session.success ? session.restaurantId : undefined;

    const metrics = getCustomerMetrics(restaurantId);
    return NextResponse.json({ success: true, metrics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener métricas";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
