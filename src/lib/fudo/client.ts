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

    const authUrl = `${this.config.base_url.replace(/\/+$/, "")}/auth`;
    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: this.config.api_key,
        apiSecret: this.config.api_secret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de autenticación con Fudo API (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const token = data.token || data.bearerToken || data.access_token;
    if (!token) {
      throw new Error("La respuesta de Fudo API no contiene un token Bearer válido");
    }

    // Default 24 hours expiry
    const expiresInSec = typeof data.expiresIn === "number" ? data.expiresIn : 86400;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

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
    const url = new URL(`${this.config.base_url.replace(/\/+$/, "")}/sales`);
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
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error al consultar ventas de Fudo (${response.status}): ${err}`);
    }

    const json = await response.json();
    const rawSales = Array.isArray(json) ? json : json.data || json.sales || [];

    // Normalize sales to FudoSale interface
    return rawSales.map((s: Record<string, unknown>) => ({
      id: String(s.id),
      total: Number(s.total || s.totalAmount || s.amount || 0),
      createdAt: String(s.createdAt || s.date || new Date().toISOString()),
      status: (s.status as "CLOSED" | "OPEN" | "CANCELED") || "CLOSED",
      type: (s.type as "TABLE" | "COUNTER" | "DELIVERY") || "TABLE",
      customerId: s.customerId ? String(s.customerId) : s.customer_id ? String(s.customer_id) : null,
    }));
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
    const url = `${this.config.base_url.replace(/\/+$/, "")}/customers/${encodeURIComponent(fudoCustomerId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
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
    const data = json.data || json;

    return {
      id: String(data.id),
      name: String(data.name || "Comensal Fudo"),
      fiscalNumber: data.fiscalNumber || data.cuit || data.dni || data.taxId ? String(data.fiscalNumber || data.cuit || data.dni || data.taxId) : null,
      phone: data.phone ? String(data.phone) : null,
      email: data.email ? String(data.email) : null,
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
    const url = `${this.config.base_url.replace(/\/+$/, "")}/customers`;

    const payload: Record<string, unknown> = {
      name: customerData.name.trim(),
    };
    if (customerData.documentNumber) {
      payload.fiscalNumber = customerData.documentNumber.trim();
      payload.cuit = customerData.documentNumber.trim();
      payload.dni = customerData.documentNumber.trim();
    }
    if (customerData.phone) {
      payload.phone = customerData.phone.trim();
    }
    if (customerData.email) {
      payload.email = customerData.email.trim();
    }
    if (customerData.address) {
      payload.address = customerData.address.trim();
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error al dar de alta cliente en Fudo (${response.status}): ${err}`);
    }

    const json = await response.json();
    const data = json.data || json;

    return {
      id: String(data.id),
      name: String(data.name || customerData.name),
      fiscalNumber:
        data.fiscalNumber || data.cuit || data.dni
          ? String(data.fiscalNumber || data.cuit || data.dni)
          : customerData.documentNumber || null,
      phone: data.phone ? String(data.phone) : customerData.phone || null,
      email: data.email ? String(data.email) : customerData.email || null,
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
