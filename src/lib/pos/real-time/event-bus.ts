import { EventEmitter } from "node:events";
import { CanonicalEvent, CanonicalSale, PosProviderType } from "../core/types";

export interface PosRealtimeNotification {
  id: string;
  type: "SALE_INGESTED" | "SALE_CANCELED" | "CUSTOMER_LINKED" | "SYNC_COMPLETED";
  provider: PosProviderType;
  timestamp: string;
  sale?: CanonicalSale;
  pointsEarned?: number;
  totalAmount?: number;
  customerName?: string;
  message: string;
}

class PosEventBus extends EventEmitter {
  private static instance: PosEventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  public static getInstance(): PosEventBus {
    if (!PosEventBus.instance) {
      PosEventBus.instance = new PosEventBus();
    }
    return PosEventBus.instance;
  }

  public emitNotification(notification: PosRealtimeNotification): void {
    this.emit("pos_notification", notification);
  }

  public onNotification(listener: (notification: PosRealtimeNotification) => void): () => void {
    this.on("pos_notification", listener);
    return () => {
      this.off("pos_notification", listener);
    };
  }

  public emitRawEvent(event: CanonicalEvent): void {
    this.emit("pos_event", event);
  }

  public onRawEvent(listener: (event: CanonicalEvent) => void): () => void {
    this.on("pos_event", listener);
    return () => {
      this.off("pos_event", listener);
    };
  }
}

export const posEventBus = PosEventBus.getInstance();
