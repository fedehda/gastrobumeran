import { posGateway } from "../core/pos-gateway";
import { PosProviderType } from "../core/types";

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  statusCode: number;
  details?: unknown;
}

export class PosWebhookHandler {
  /**
   * Procesa un webhook entrante desde cualquier sistema POS
   */
  public static async handleIncomingWebhook(
    providerName: string,
    payload: unknown,
    headers: Record<string, string>,
    querySecret?: string | null
  ): Promise<WebhookProcessingResult> {
    const normalizedProvider = providerName.trim().toUpperCase() as PosProviderType;

    // Validación opcional de secreto de webhook
    const expectedSecret = process.env.POS_WEBHOOK_SECRET || process.env.CRON_SECRET;
    if (expectedSecret) {
      const authHeader = headers["authorization"] || headers["x-webhook-secret"] || "";
      const isAuth =
        authHeader === `Bearer ${expectedSecret}` ||
        authHeader === expectedSecret ||
        querySecret === expectedSecret;

      if (!isAuth) {
        return {
          success: false,
          message: "No autorizado. Token de webhook inválido.",
          statusCode: 401,
        };
      }
    }

    try {
      const adapter = posGateway.getAdapter(normalizedProvider);
      const canonicalEvent = adapter.translateWebhookPayload(payload, headers);

      if (!canonicalEvent) {
        return {
          success: false,
          message: `El payload recibido no pudo ser traducido a un evento válido para el proveedor '${normalizedProvider}'.`,
          statusCode: 422,
          details: payload,
        };
      }

      const result = await posGateway.processRealtimeEvent(canonicalEvent);

      return {
        success: result.success,
        message: result.message,
        statusCode: result.success ? 200 : 400,
        details: result.details,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error al procesar webhook de '${normalizedProvider}': ${msg}`,
        statusCode: 500,
      };
    }
  }
}
