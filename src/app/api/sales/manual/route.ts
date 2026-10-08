import { NextRequest, NextResponse } from "next/server";
import { processSale } from "@/lib/loyalty/engine";
import { requireSession } from "@/lib/auth/require-session";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req, { allowedRoles: ["ADMIN", "PLATFORM_ADMIN", "OPERATOR"] });
    if (!session.success) return session.response;
    const { restaurantId } = session;

    const body = await req.json();
    const { customerId, documentNumber, totalAmount, concept, saleDate, saleType } = body;

    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "El importe de la venta debe ser mayor a 0." },
        { status: 400 }
      );
    }

    if (!customerId && !documentNumber) {
      return NextResponse.json(
        { success: false, error: "Debes seleccionar un cliente o ingresar un DNI válido." },
        { status: 400 }
      );
    }

    const result = processSale({
      customerId,
      documentNumber,
      totalAmount: amount,
      source: "MANUAL",
      saleType: saleType as ("TABLE" | "COUNTER" | "DELIVERY") | undefined,
      concept: concept || undefined,
      saleDate: saleDate || undefined,
      restaurantId,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar la venta";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
