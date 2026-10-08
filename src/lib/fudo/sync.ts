import { posGateway } from "@/lib/pos/core/pos-gateway";
import { FudoApiClient } from "./client";
import { FudoSyncResult } from "@/types/loyalty";

export interface SyncOptions {
  fullSync?: boolean;
  syncCustomers?: boolean;
}

export interface CustomerSyncResult {
  totalFudoCustomers: number;
  importedCount: number;
  updatedCount: number;
}

/**
 * Wrapper de compatibilidad que delega al nuevo POS Gateway
 */
export async function syncFudoCustomers(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _clientInstance?: FudoApiClient,
  restaurantId?: string
): Promise<CustomerSyncResult> {
  const result = await posGateway.syncCustomers("FUDO", restaurantId);
  return {
    totalFudoCustomers: result.total,
    importedCount: result.importedCount,
    updatedCount: result.updatedCount,
  };
}

/**
 * Wrapper de compatibilidad que delega al nuevo POS Gateway
 */
export async function syncFudoSales(
  options?: SyncOptions,
  restaurantId?: string
): Promise<FudoSyncResult> {
  return posGateway.syncSales({
    provider: "FUDO",
    fullSync: options?.fullSync,
    syncCustomers: options?.syncCustomers,
    restaurantId,
  });
}
