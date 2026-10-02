export type PosProviderType = "FUDO" | "MAXIREST" | "BISTRO" | "TANGO" | "GENERIC";

export type CanonicalSaleStatus = "CLOSED" | "OPEN" | "CANCELED";

export type CanonicalSaleType = "TABLE" | "COUNTER" | "DELIVERY";

export interface CanonicalCustomerRef {
  externalId?: string | null;
  documentNumber?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface CanonicalSaleItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

export interface CanonicalSale {
  id?: string;
  externalSaleId: string;
  provider: PosProviderType;
  totalAmount: number;
  saleDate: string; // ISO 8601
  status: CanonicalSaleStatus;
  saleType: CanonicalSaleType;
  customer?: CanonicalCustomerRef | null;
  items?: CanonicalSaleItem[];
  concept?: string;
  rawPayload?: unknown;
}

export interface CanonicalCustomer {
  externalId: string;
  provider: PosProviderType;
  documentNumber?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
  rawPayload?: unknown;
}

export type CanonicalEventType =
  | "SALE_CLOSED"
  | "SALE_CANCELED"
  | "CUSTOMER_CREATED"
  | "CUSTOMER_UPDATED"
  | "PING";

export interface CanonicalEvent {
  eventType: CanonicalEventType;
  provider: PosProviderType;
  timestamp: string;
  sale?: CanonicalSale;
  customer?: CanonicalCustomer;
  rawPayload?: unknown;
}

export interface PosAdapterCapabilities {
  supportsSalesIngestion: boolean;
  supportsCustomerDirectory: boolean;
  supportsPushCustomer: boolean;
  supportsRealtimeWebhooks: boolean;
  supportsRealtimeListener: boolean;
  supportsSaleItems: boolean;
}

export interface PosSyncOptions {
  provider?: PosProviderType;
  fullSync?: boolean;
  syncCustomers?: boolean;
  fromIso?: string;
  toIso?: string;
  limit?: number;
}

export interface PosSyncResult {
  provider: PosProviderType;
  totalRetrieved: number;
  syncedCount: number;
  duplicatedCount: number;
  canceledCount: number;
  unassignedCount: number;
  newCustomersCount: number;
  importedCustomersCount: number;
  updatedCustomersCount: number;
  totalPointsEarned: number;
  totalAmountProcessed: number;
  errors: string[];
  lastSyncAt: string;
}

export interface PosConnectionTestResult {
  success: boolean;
  provider: PosProviderType;
  isSandbox?: boolean;
  tokenPreview?: string;
  expiresAt?: string;
  message: string;
  details?: unknown;
}
