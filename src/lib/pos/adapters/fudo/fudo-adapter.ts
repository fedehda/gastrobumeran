import { IPosAdapter } from "../../core/pos-adapter.interface";
import {
  CanonicalSale,
  CanonicalCustomer,
  CanonicalEvent,
  PosAdapterCapabilities,
  PosConnectionTestResult,
} from "../../core/types";
import { FudoClient } from "./fudo-client";
import { FudoTranslator } from "./fudo-translator";
import { FudoConfig } from "@/types/loyalty";
import { FudoApiClient } from "@/lib/fudo/client";

export class FudoAdapter implements IPosAdapter {
  public readonly providerId = "FUDO";
  public readonly displayName = "Fudo POS";

  private client: FudoClient;

  constructor(customConfig?: FudoConfig) {
    this.client = new FudoClient(customConfig);
  }

  public getClient(): FudoClient {
    return this.client;
  }

  public getCapabilities(): PosAdapterCapabilities {
    return {
      supportsSalesIngestion: true,
      supportsCustomerDirectory: true,
      supportsPushCustomer: true,
      supportsRealtimeWebhooks: true,
      supportsRealtimeListener: true,
      supportsSaleItems: false,
    };
  }

  public async authenticate(forceRenew = false): Promise<{ token: string; expiresAt: string }> {
    return this.client.authenticate(forceRenew);
  }

  public async testConnection(): Promise<PosConnectionTestResult> {
    const isSandbox = this.client.isSandbox();
    try {
      const auth = await this.client.authenticate(true);
      return {
        success: true,
        provider: "FUDO",
        isSandbox,
        tokenPreview: auth.token.slice(0, 16) + "...",
        expiresAt: auth.expiresAt,
        message: isSandbox
          ? "Conexión exitosa con el Simulador Sandbox de Fudo (Modo demostración activo)."
          : "Conexión exitosa autenticada contra la API Pública oficial de Fudo.",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        provider: "FUDO",
        isSandbox,
        message: `Fallo de autenticación con Fudo: ${msg}`,
        details: err,
      };
    }
  }

  public async fetchClosedSales(options?: {
    since?: string;
    until?: string;
    limit?: number;
  }): Promise<CanonicalSale[]> {
    const apiClient = new FudoApiClient();
    const sales = await apiClient.getClosedSales(options?.since, options?.until);

    return sales.map((s) => ({
      externalSaleId: s.id,
      provider: "FUDO",
      totalAmount: s.total,
      saleDate: s.createdAt,
      status: s.status,
      saleType: s.type,
      customer: {
        externalId: s.customerId,
        documentNumber: s.customerDocument,
        name: s.customerName,
        phone: s.customerPhone,
      },
      concept: `Venta Fudo #${s.id} (${s.type === "TABLE" ? "Mesa" : s.type === "COUNTER" ? "Mostrador" : "Delivery"})`,
    }));
  }

  public async fetchCustomer(externalId: string): Promise<CanonicalCustomer | null> {
    if (!externalId) return null;
    const apiClient = new FudoApiClient();
    const cust = await apiClient.getCustomer(externalId);
    if (!cust) return null;
    return {
      externalId: cust.id,
      provider: "FUDO",
      name: cust.name,
      documentNumber: cust.fiscalNumber || null,
      phone: cust.phone || null,
      email: cust.email || null,
      birthDate: cust.birthDate || null,
      address: cust.address || null,
    };
  }

  public async fetchCustomers(options?: {
    activeOnly?: boolean;
    limit?: number;
    sort?: string;
  }): Promise<CanonicalCustomer[]> {
    const apiClient = new FudoApiClient();
    const rawCustomers = await apiClient.getCustomers({
      activeOnly: options?.activeOnly,
      limit: options?.limit,
      sort: options?.sort,
    });

    return rawCustomers.map((c) => ({
      externalId: c.id,
      provider: "FUDO",
      name: c.name,
      documentNumber: c.fiscalNumber || null,
      phone: c.phone || null,
      email: c.email || null,
      birthDate: c.birthDate || null,
      address: c.address || null,
    }));
  }

  public async createOrUpdateCustomer(
    customer: Partial<CanonicalCustomer>
  ): Promise<CanonicalCustomer> {
    const apiClient = new FudoApiClient();
    const created = await apiClient.createCustomer({
      name: customer.name || "",
      documentNumber: customer.documentNumber,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      birthDate: customer.birthDate,
    });

    return {
      externalId: created.id,
      provider: "FUDO",
      name: created.name,
      documentNumber: created.fiscalNumber || null,
      phone: created.phone || null,
      email: created.email || null,
    };
  }

  public translateWebhookPayload(
    payload: unknown,
    headers?: Record<string, string>
  ): CanonicalEvent | null {
    return FudoTranslator.toCanonicalEvent(payload, headers);
  }
}
