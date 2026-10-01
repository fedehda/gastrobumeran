import { FudoConfig, FudoCustomer, FudoSale } from "@/types/loyalty";
import { getFudoConfig, updateFudoToken } from "@/lib/db/fudo-repo";

export class FudoApiClient {
  private config: FudoConfig;

  constructor(customConfig?: FudoConfig) {
    this.config = customConfig || getFudoConfig();
  }

  public isSandbox(): boolean {
    const key = (this.config.api_key || "").trim().toUpperCase();
    const secret = (this.config.api_secret || "").trim().toUpperCase();
    return (
      key.startsWith("DEMO_") ||
      secret.startsWith("DEMO_") ||
      key === "SANDBOX" ||
      !key ||
      !secret
    );
  }

  public getAuthUrl(): string {
    const envAuth = process.env.FUDO_AUTH_URL?.trim();
    if (envAuth) return envAuth;
    if (this.config.auth_url?.trim()) return this.config.auth_url.trim();
    return "https://auth.fu.do/api";
  }

  public getApiBaseUrl(): string {
    let url = (process.env.FUDO_BASE_URL || this.config.base_url || "https://api.fu.do/v1alpha1").trim().replace(/\/+$/, "");
    if (url.includes("auth.fu.do")) {
      url = "https://api.fu.do/v1alpha1";
    }
    return url;
  }

  /**
   * Authenticates against Fudo API or Simulates token generation for Sandbox
   */
  public async authenticate(forceRenew = false): Promise<string> {
    if (!forceRenew && this.config.bearer_token && this.config.token_expires_at) {
      const expiresAt = new Date(this.config.token_expires_at).getTime();
      const now = Date.now();
      // If valid with at least 5 minutes margin
      if (expiresAt - now > 5 * 60 * 1000) {
        return this.config.bearer_token;
      }
    }

    if (this.isSandbox()) {
      const mockToken = `fudo_demo_jwt_${Buffer.from(this.config.api_key || "demo").toString("base64")}_${Date.now()}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      updateFudoToken(mockToken, expiresAt);
      this.config.bearer_token = mockToken;
      this.config.token_expires_at = expiresAt;
      return mockToken;
    }

    const authUrl = this.getAuthUrl();
    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        apiKey: this.config.api_key,
        apiSecret: this.config.api_secret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de autenticación con Fudo API (${response.status} en ${authUrl}): ${errorText}`);
    }

    const data = await response.json();
    const token = data.token || data.bearerToken || data.access_token;
    if (!token) {
      throw new Error("La respuesta de Fudo API no contiene un token Bearer válido");
    }

    let expiresAt: string;
    if (typeof data.exp === "number") {
      // Unix timestamp in seconds
      expiresAt = new Date(data.exp * 1000).toISOString();
    } else if (typeof data.expiresIn === "number") {
      expiresAt = new Date(Date.now() + data.expiresIn * 1000).toISOString();
    } else {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    updateFudoToken(token, expiresAt);
    this.config.bearer_token = token;
    this.config.token_expires_at = expiresAt;

    return token;
  }

  /**
   * Fetches closed sales from Fudo API or generates sandbox sales
   */
  public async getClosedSales(fromIso?: string, toIso?: string): Promise<FudoSale[]> {
    if (this.isSandbox()) {
      return this.getSandboxSales(fromIso);
    }

    const token = await this.authenticate();
    const baseUrl = this.getApiBaseUrl();
    const url = new URL(`${baseUrl}/sales`);
    url.searchParams.set("status", "CLOSED");
    if (fromIso) {
      url.searchParams.set("from", fromIso);
    }
    if (toIso) {
      url.searchParams.set("to", toIso);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error al consultar ventas de Fudo (${response.status}): ${err}`);
    }

    const json = await response.json();
    const rawSales = Array.isArray(json) ? json : json.data || json.sales || [];

    // Normalize sales to FudoSale interface (supports JSON:API attributes/relationships as well as flat fields)
    return rawSales.map((s: Record<string, unknown>) => {
      const attrs = (s.attributes as Record<string, unknown>) || {};
      const rels = (s.relationships as Record<string, unknown>) || {};
      const custRel = (rels.customer as Record<string, unknown>)?.data as Record<string, unknown> | undefined;

      return {
        id: String(s.id),
        total: Number(attrs.total ?? s.total ?? s.totalAmount ?? s.amount ?? 0),
        createdAt: String(attrs.createdAt || s.createdAt || s.date || new Date().toISOString()),
        status: ((attrs.status || s.status) as "CLOSED" | "OPEN" | "CANCELED") || "CLOSED",
        type: ((attrs.type || s.type) as "TABLE" | "COUNTER" | "DELIVERY") || "TABLE",
        customerId: custRel?.id ? String(custRel.id) : (s.customerId ? String(s.customerId) : s.customer_id ? String(s.customer_id) : null),
      };
    });
  }

  /**
   * Fetches customer details by ID from Fudo or sandbox customer directory
   */
  public async getCustomer(fudoCustomerId: string): Promise<FudoCustomer | null> {
    if (!fudoCustomerId) return null;

    if (this.isSandbox()) {
      return this.getSandboxCustomer(fudoCustomerId);
    }

    const token = await this.authenticate();
    const baseUrl = this.getApiBaseUrl();
    const url = `${baseUrl}/customers/${encodeURIComponent(fudoCustomerId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error al consultar cliente en Fudo (${response.status}): ${err}`);
    }

    const json = await response.json();
    const data = (json.data || json) as Record<string, unknown>;
    const attrs = (data.attributes as Record<string, unknown>) || data;

    return {
      id: String(data.id),
      name: String(attrs.name || "Comensal Fudo"),
      fiscalNumber:
        attrs.fiscalNumber || attrs.cuit || attrs.dni || attrs.taxId
          ? String(attrs.fiscalNumber || attrs.cuit || attrs.dni || attrs.taxId)
          : null,
      phone: attrs.phone ? String(attrs.phone) : null,
      email: attrs.email ? String(attrs.email) : null,
    };
  }

  /**
   * Registers a customer into Fudo POS via API or simulates creation in Sandbox
   */
  public async createCustomer(customerData: {
    name: string;
    documentNumber?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }): Promise<FudoCustomer> {
    if (this.isSandbox()) {
      return this.createSandboxCustomer(customerData);
    }

    const token = await this.authenticate();
    const baseUrl = this.getApiBaseUrl();
    const url = `${baseUrl}/customers`;

    const attributes: Record<string, unknown> = {
      name: customerData.name.trim(),
    };
    if (customerData.documentNumber) {
      attributes.fiscalNumber = customerData.documentNumber.trim();
      attributes.cuit = customerData.documentNumber.trim();
      attributes.dni = customerData.documentNumber.trim();
    }
    if (customerData.phone) {
      attributes.phone = customerData.phone.trim();
    }
    if (customerData.email) {
      attributes.email = customerData.email.trim();
    }
    if (customerData.address) {
      attributes.address = customerData.address.trim();
    }

    // Try standard JSON:API payload first
    const jsonApiPayload = {
      data: {
        type: "customers",
        attributes,
      },
    };

    let response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(jsonApiPayload),
    });

    if (!response.ok) {
      // Fallback to flat payload if JSON:API was not expected by Fudo endpoint
      const flatPayload = {
        name: customerData.name.trim(),
        fiscalNumber: customerData.documentNumber?.trim() || undefined,
        cuit: customerData.documentNumber?.trim() || undefined,
        dni: customerData.documentNumber?.trim() || undefined,
        phone: customerData.phone?.trim() || undefined,
        email: customerData.email?.trim() || undefined,
        address: customerData.address?.trim() || undefined,
      };

      const fallbackRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(flatPayload),
      });

      if (fallbackRes.ok) {
        response = fallbackRes;
      } else {
        const err = await response.text();
        throw new Error(`Error al dar de alta cliente en Fudo (${response.status}): ${err}`);
      }
    }

    const json = await response.json();
    const data = (json.data || json) as Record<string, unknown>;
    const attrs = (data.attributes as Record<string, unknown>) || data;

    return {
      id: String(data.id),
      name: String(attrs.name || customerData.name),
      fiscalNumber:
        attrs.fiscalNumber || attrs.cuit || attrs.dni
          ? String(attrs.fiscalNumber || attrs.cuit || attrs.dni)
          : customerData.documentNumber || null,
      phone: attrs.phone ? String(attrs.phone) : customerData.phone || null,
      email: attrs.email ? String(attrs.email) : customerData.email || null,
    };
  }

  // --- Sandbox Simulator Helpers ---

  private createSandboxCustomer(customerData: {
    name: string;
    documentNumber?: string | null;
    phone?: string | null;
    email?: string | null;
  }): FudoCustomer {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const mockId = `FUDO-CUST-${randomSuffix}`;

    return {
      id: mockId,
      name: customerData.name.trim(),
      fiscalNumber:
        customerData.documentNumber?.trim() ||
        `30${Math.floor(1000000 + Math.random() * 8999999)}`,
      phone: customerData.phone?.trim() || null,
      email: customerData.email?.trim() || null,
    };
  }

  private getSandboxSales(fromIso?: string): FudoSale[] {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const mockSales: FudoSale[] = [
      {
        id: "FUDO-SALE-2001",
        total: 32400.0,
        createdAt: new Date(now - 2 * oneHour).toISOString(),
        status: "CLOSED",
        type: "TABLE",
        customerId: "FUDO-CUST-101",
      },
      {
        id: "FUDO-SALE-2002",
        total: 14850.0,
        createdAt: new Date(now - 3.5 * oneHour).toISOString(),
        status: "CLOSED",
        type: "COUNTER",
        customerId: "FUDO-CUST-102",
      },
      {
        id: "FUDO-SALE-2003",
        total: 54200.0,
        createdAt: new Date(now - 5 * oneHour).toISOString(),
        status: "CLOSED",
        type: "TABLE",
        customerId: "FUDO-CUST-103",
      },
      {
        id: "FUDO-SALE-2004",
        total: 22600.0,
        createdAt: new Date(now - 6.5 * oneHour).toISOString(),
        status: "CLOSED",
        type: "DELIVERY",
        customerId: "FUDO-CUST-104",
      },
      {
        id: "FUDO-SALE-2005",
        total: 19500.0,
        createdAt: new Date(now - 24 * oneHour).toISOString(),
        status: "CLOSED",
        type: "TABLE",
        customerId: "FUDO-CUST-101", // Recompra de Esteban Morales
      },
      {
        id: "FUDO-SALE-2006",
        total: 8200.0,
        createdAt: new Date(now - 28 * oneHour).toISOString(),
        status: "CLOSED",
        type: "COUNTER",
        customerId: "FUDO-CUST-105",
      },
    ];

    if (fromIso) {
      const fromTime = new Date(fromIso).getTime();
      const filtered = mockSales.filter((s) => new Date(s.createdAt).getTime() >= fromTime);
      if (filtered.length > 0) return filtered;

      // In sandbox mode, simulate a live incoming closed sale so incremental sync demonstrates real-time ingestion
      const liveSaleId = `FUDO-LIVE-${Math.floor(Date.now() / 1000)}`;
      const liveSale: FudoSale = {
        id: liveSaleId,
        total: 18500.0,
        createdAt: new Date().toISOString(),
        status: "CLOSED",
        type: "TABLE",
        customerId: "FUDO-CUST-102", // Florencia Varela
      };
      return [liveSale];
    }

    return mockSales;
  }

  private getSandboxCustomer(fudoCustomerId: string): FudoCustomer {
    const sandboxDirectory: Record<string, FudoCustomer> = {
      "FUDO-CUST-101": {
        id: "FUDO-CUST-101",
        name: "Esteban Morales",
        fiscalNumber: "32111222",
        phone: "+5491144332211",
        email: "esteban.morales@gmail.com",
      },
      "FUDO-CUST-102": {
        id: "FUDO-CUST-102",
        name: "Florencia Varela",
        fiscalNumber: "38999888",
        phone: "+5491188776655",
        email: "flor.varela@hotmail.com",
      },
      "FUDO-CUST-103": {
        id: "FUDO-CUST-103",
        name: "Gonzalo Peñaloza",
        fiscalNumber: "29444555",
        phone: "+5491133221100",
        email: "gonzalo.p@gmail.com",
      },
      "FUDO-CUST-104": {
        id: "FUDO-CUST-104",
        name: "Camila Rossi",
        fiscalNumber: "36555444",
        phone: "+5491166554433",
        email: "camila.rossi@yahoo.com",
      },
      "FUDO-CUST-105": {
        id: "FUDO-CUST-105",
        name: "Martín Benítez",
        fiscalNumber: "41222333",
        phone: "+5491177889900",
        email: "martin.b@outlook.com",
      },
    };

    return (
      sandboxDirectory[fudoCustomerId] || {
        id: fudoCustomerId,
        name: `Cliente Fudo (${fudoCustomerId})`,
        fiscalNumber: `99${Math.floor(100000 + Math.random() * 900000)}`,
        phone: "+5491100001111",
        email: `cliente.${fudoCustomerId.toLowerCase()}@fudo.test`,
      }
    );
  }
}
