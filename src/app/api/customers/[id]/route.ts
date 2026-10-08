import { NextRequest, NextResponse } from "next/server";
import {
  findCustomerById,
  getCustomerPointsHistory,
  getCustomerSales,
  getCustomerActiveBatches,
  checkBirthdayStatus,
  updateCustomerLoyaltyEnrollment,
} from "@/lib/db/customer-repo";
import { getActiveRewards } from "@/lib/db/settings-repo";
import { requireSession } from "@/lib/auth/require-session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN", "OPERATOR"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;

    const { id } = await params;
    const customer = findCustomerById(id, restaurantId);

    if (!customer) {
      return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });
    }

    const pointsHistory = getCustomerPointsHistory(id, 20);
    const sales = getCustomerSales(id, 20);
    const activeBatches = getCustomerActiveBatches(id);
    const allRewards = getActiveRewards(restaurantId);
    const birthdayStatus = checkBirthdayStatus(customer);

    // Calculate days until inactivity expiration (Timer 1)
    let daysUntilExpiration: number | null = null;
    let isExpiringSoon = false;
    if (customer.points_expire_at && customer.points_balance > 0) {
      const expDate = new Date(customer.points_expire_at).getTime();
      const now = new Date().getTime();
      daysUntilExpiration = Math.max(0, Math.ceil((expDate - now) / (1000 * 60 * 60 * 24)));
      isExpiringSoon = daysUntilExpiration <= 15;
    }

    // Oldest active batch expiration (Timer 2)
    let oldestBatchDaysLeft: number | null = null;
    if (activeBatches.length > 0) {
      const oldestExp = new Date(activeBatches[0].expires_at).getTime();
      const now = new Date().getTime();
      oldestBatchDaysLeft = Math.max(0, Math.ceil((oldestExp - now) / (1000 * 60 * 60 * 24)));
    }

    // Evaluate rewards availability
    const eligibleRewards = allRewards.map((reward) => {
      let isEligible = false;
      let progress = 0;

      if (reward.reward_type === "POINTS") {
        isEligible = customer.points_balance >= reward.requirement_value;
        progress = Math.min(100, Math.round((customer.points_balance / reward.requirement_value) * 100));
      } else if (reward.reward_type === "VISIT_MILESTONE") {
        isEligible = customer.visit_count >= reward.requirement_value;
        progress = Math.min(100, Math.round((customer.visit_count / reward.requirement_value) * 100));
      } else if (reward.reward_type === "BIRTHDAY_GIFT") {
        isEligible = birthdayStatus.isEligible;
        progress = isEligible ? 100 : 0;
      }

      return {
        ...reward,
        isEligible,
        progress,
      };
    });

    return NextResponse.json({
      success: true,
      customer,
      daysUntilExpiration,
      isExpiringSoon,
      oldestBatchDaysLeft,
      birthdayStatus,
      activeBatches,
      pointsHistory,
      sales,
      eligibleRewards,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener datos del cliente";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN", "OPERATOR"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;

    const { id } = await params;
    const body = await req.json();
    const { loyalty_enrolled } = body;

    if (loyalty_enrolled === undefined) {
      return NextResponse.json(
        { success: false, error: "El campo loyalty_enrolled es obligatorio." },
        { status: 400 }
      );
    }

    const result = updateCustomerLoyaltyEnrollment(id, Boolean(loyalty_enrolled), restaurantId);

    return NextResponse.json({
      success: true,
      customer: result.customer,
      welcomePointsAwarded: result.welcomePointsAwarded,
      message: result.customer.loyalty_enrolled
        ? `Comensal adherido con éxito al programa de fidelidad.${result.welcomePointsAwarded > 0 ? ` ¡Se le acreditaron +${result.welcomePointsAwarded} puntos de bienvenida!` : ""}`
        : "Comensal dado de baja del programa de fidelidad (no acumulará puntos).",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar estado del cliente";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
