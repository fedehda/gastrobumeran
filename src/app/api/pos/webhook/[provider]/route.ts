import { NextRequest, NextResponse } from "next/server";
import { PosWebhookHandler } from "@/lib/pos/real-time/webhook-handler";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  try {
    const rawBody = await req.json().catch(() => ({}));
    const headersRecord: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });

    const searchParams = req.nextUrl.searchParams;
    const querySecret = searchParams.get("secret") || searchParams.get("key");
    const queryRestaurantId =
      searchParams.get("restaurantId") ||
      searchParams.get("resto") ||
      headersRecord["x-restaurant-id"] ||
      undefined;

    const result = await PosWebhookHandler.handleIncomingWebhook(
      provider,
      rawBody,
      headersRecord,
      querySecret,
      queryRestaurantId
    );

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        details: result.details,
      },
      { status: result.statusCode }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno al procesar webhook";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return NextResponse.json({
    status: "online",
    provider: provider.toUpperCase(),
    endpoint: `/api/pos/webhook/${provider}`,
    timestamp: new Date().toISOString(),
    message: `Receptor de Webhooks en tiempo real activo para ${provider.toUpperCase()}`,
  });
}
