import {
  PosProviderType,
  CanonicalSale,
  CanonicalCustomer,
  CanonicalEvent,
  PosAdapterCapabilities,
  PosConnectionTestResult,
} from "./types";

export interface IPosAdapter {
  readonly providerId: PosProviderType;
  readonly displayName: string;

  getCapabilities(): PosAdapterCapabilities;

  authenticate(forceRenew?: boolean): Promise<{ token: string; expiresAt: string }>;

  testConnection(): Promise<PosConnectionTestResult>;

  fetchClosedSales(options?: {
    since?: string;
    until?: string;
    limit?: number;
  }): Promise<CanonicalSale[]>;

  fetchCustomer(externalId: string): Promise<CanonicalCustomer | null>;

  fetchCustomers(options?: {
    activeOnly?: boolean;
    limit?: number;
    sort?: string;
  }): Promise<CanonicalCustomer[]>;

  createOrUpdateCustomer(customer: Partial<CanonicalCustomer>): Promise<CanonicalCustomer>;

  translateWebhookPayload(payload: unknown, headers?: Record<string, string>): CanonicalEvent | null;
}
