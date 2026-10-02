import { NextRequest, NextResponse } from "next/server";
import { cancelSale } from "@/lib/loyalty/engine";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "ID de venta requerido." }, { status: 400 });
    }

    let reason = "Anulación manual en caja";
    try {
      const url = new URL(req.url);
      const qReason = url.searchParams.get("reason");
      if (qReason) {
        reason = qReason;
      } else {
        const body = await req.json().catch(() => ({}));
        if (body?.reason) reason = String(body.reason);
      }
    } catch {
      // Ignore body parse errors
    }

    const result = cancelSale(id, reason);
    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al anular la venta";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return DELETE(req, { params });
}
