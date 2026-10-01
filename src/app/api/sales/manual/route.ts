import { NextRequest, NextResponse } from "next/server";
import { processSale } from "@/lib/loyalty/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, documentNumber, totalAmount, concept, saleDate } = body;

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
      concept: concept || undefined,
      saleDate: saleDate || undefined,
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
