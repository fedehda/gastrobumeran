import { FudoConfig, FudoCustomer, FudoSale } from "@/types/loyalty";
import { FudoClient } from "@/lib/pos/adapters/fudo/fudo-client";
import { FudoTranslator } from "@/lib/pos/adapters/fudo/fudo-translator";

/**
 * FudoApiClient: Wrapper de retrocompatibilidad.
 * Delega al nuevo módulo desacoplado (FudoClient y FudoTranslator).
 */
export class FudoApiClient {
  private client: FudoClient;

  constructor(customConfig?: FudoConfig) {
    this.client = new FudoClient(customConfig);
  }

  public isSandbox(): boolean {
    return this.client.isSandbox();
  }

  public getAuthUrl(): string {
    return this.client.getAuthUrl();
  }

  public getApiBaseUrl(): string {
    return this.client.getApiBaseUrl();
  }

  public async authenticate(forceRenew = false): Promise<string> {
    const auth = await this.client.authenticate(forceRenew);
    return auth.token;
  }

  public async getClosedSales(fromIso?: string, toIso?: string): Promise<FudoSale[]> {
    const { sales, includedCustomers } = await this.client.fetchRawClosedSales({
      fromIso,
      toIso,
    });

    return sales.map((raw) => {
      const canonical = FudoTranslator.toCanonicalSale(raw, includedCustomers);
      return {
        id: canonical.externalSaleId,
        total: canonical.totalAmount,
        createdAt: canonical.saleDate,
        status: canonical.status,
        type: canonical.saleType,
        customerId: canonical.customer?.externalId || null,
        customerName: canonical.customer?.name || null,
        customerPhone: canonical.customer?.phone || null,
        customerDocument: canonical.customer?.documentNumber || null,
      };
    });
  }

  public async getCustomer(fudoCustomerId: string): Promise<FudoCustomer | null> {
    const raw = await this.client.fetchRawCustomer(fudoCustomerId);
    if (!raw) return null;
    const canonical = FudoTranslator.toCanonicalCustomer(raw);
    return {
      id: canonical.externalId,
      name: canonical.name,
      fiscalNumber: canonical.documentNumber,
      phone: canonical.phone,
      email: canonical.email,
      birthDate: canonical.birthDate,
      address: canonical.address,
    };
  }

  public async getCustomers(options?: {
    activeOnly?: boolean;
    limit?: number;
    sort?: string;
  }): Promise<FudoCustomer[]> {
    const rawList = await this.client.fetchRawCustomers(options);
    return rawList.map((raw) => {
      const canonical = FudoTranslator.toCanonicalCustomer(raw);
      return {
        id: canonical.externalId,
        name: canonical.name,
        fiscalNumber: canonical.documentNumber,
        phone: canonical.phone,
        email: canonical.email,
        birthDate: canonical.birthDate,
        address: canonical.address,
      };
    });
  }

  public async createCustomer(customerData: {
    name: string;
    documentNumber?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    birthDate?: string | null;
  }): Promise<FudoCustomer> {
    const payload = FudoTranslator.toFudoCustomerPayload({
      name: customerData.name,
      documentNumber: customerData.documentNumber,
      phone: customerData.phone,
      email: customerData.email,
      address: customerData.address,
      birthDate: customerData.birthDate,
    });

    const raw = await this.client.postCustomerPayload(payload);
    const canonical = FudoTranslator.toCanonicalCustomer(raw);

    return {
      id: canonical.externalId,
      name: canonical.name,
      fiscalNumber: canonical.documentNumber,
      phone: canonical.phone,
      email: canonical.email,
    };
  }
}
