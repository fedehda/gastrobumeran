import { NextResponse } from "next/server";
import { syncFudoSales } from "@/lib/fudo/sync";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const fullSync = Boolean(body.fullSync);

    const result = await syncFudoSales({ fullSync });
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error durante la sincronización con Fudo";
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
