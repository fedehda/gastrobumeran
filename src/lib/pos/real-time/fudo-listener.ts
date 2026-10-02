import { posGateway } from "../core/pos-gateway";
import { getFudoConfig } from "@/lib/db/fudo-repo";
import { FudoConfig } from "@/types/loyalty";

export interface FudoListenerOptions {
  intervalMs?: number; // Intervalo base en milisegundos (por defecto 3000ms = 3s)
  onSaleDetected?: (saleId: string, amount: number) => void;
  onError?: (err: Error) => void;
}

export class FudoRealtimeListener {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private lastCheckedIso: string;
  private intervalMs: number;
  private consecutiveErrors = 0;
  private options: FudoListenerOptions;

  constructor(options: FudoListenerOptions = {}) {
    this.options = options;
    this.intervalMs = Math.max(1000, options.intervalMs || 3000);
    // Iniciar con la marca de tiempo actual (o últimos 10 minutos para capturar lo reciente)
    this.lastCheckedIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  }

  public getStatus(): { isRunning: boolean; intervalMs: number; lastCheckedIso: string } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      lastCheckedIso: this.lastCheckedIso,
    };
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    const config: FudoConfig = getFudoConfig();
    const isConfigured = Boolean(config.api_key && config.api_secret);

    console.log("⚡ [Fudo Real-Time Listener] Iniciando servicio de escucha continua en vivo...");
    console.log(`- API URL: ${config.base_url}`);
    console.log(`- Frecuencia: cada ${this.intervalMs / 1000}s`);
    console.log(`- Credenciales: ${isConfigured ? "Configuradas" : "Modo Sandbox / Demo"}`);

    // Ejecutar ciclo inicial
    await this.tick();

    // Programar bucle
    this.scheduleNextTick();
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log("🛑 [Fudo Real-Time Listener] Servicio de escucha continua detenido.");
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;

    // Backoff exponencial en caso de errores de red (hasta máximo 30s)
    const delay = Math.min(30000, this.intervalMs * Math.pow(1.5, Math.min(5, this.consecutiveErrors)));

    this.timer = setTimeout(async () => {
      await this.tick();
      this.scheduleNextTick();
    }, delay);
  }

  private async tick(): Promise<void> {
    if (!this.isRunning) return;

    const currentTickTime = new Date().toISOString();
    try {
      // Ingesta de ventas cerradas desde la última marca temporal
      const result = await posGateway.syncSales({
        provider: "FUDO",
        fullSync: false,
        syncCustomers: false,
        fromIso: this.lastCheckedIso,
      });

      this.consecutiveErrors = 0;
      this.lastCheckedIso = currentTickTime;

      if (result.syncedCount > 0 || result.canceledCount > 0) {
        console.log(
          `⚡ [Fudo Real-Time Listener] Evento detectado: ${result.syncedCount} venta(s) acreditada(s) ($${result.totalAmountProcessed}), ${result.canceledCount} cancelada(s).`
        );
      }
    } catch (err: unknown) {
      this.consecutiveErrors++;
      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (this.options.onError) {
        this.options.onError(errorObj);
      }
      console.warn(
        `⚠️ [Fudo Real-Time Listener] Glitch temporal de conexión (${this.consecutiveErrors}): ${errorObj.message}`
      );
    }
  }
}
