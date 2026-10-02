import { posEventBus, PosRealtimeNotification } from "@/lib/pos/real-time/event-bus";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection message
      const initialPayload = JSON.stringify({
        type: "CONNECTED",
        message: "Canal SSE de GastroBumeran POS conectado.",
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`data: ${initialPayload}\n\n`));

      // 2. Subscribe to POS event bus notifications
      unsubscribe = posEventBus.onNotification((notif: PosRealtimeNotification) => {
        try {
          const payload = JSON.stringify(notif);
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // Stream might be closed
        }
      });

      // 3. Heartbeat every 25 seconds to keep connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 25000);
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
