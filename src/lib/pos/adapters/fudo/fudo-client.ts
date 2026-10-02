import { FudoConfig } from "@/types/loyalty";
import { getFudoConfig, updateFudoToken } from "@/lib/db/fudo-repo";
import {
  FudoRawSale,
  FudoRawCustomer,
  FudoRawCustomerAttributes,
  FudoJsonApiResponse,
} from "./types";

export class FudoClient {
  private config: FudoConfig;

  constructor(customConfig?: FudoConfig) {
    this.config = customConfig || getFudoConfig();
  }

  public getConfig(): FudoConfig {
    return this.config;
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
    let url = (process.env.FUDO_BASE_URL || this.config.base_url || "https://api.fu.do/v1alpha1")
      .trim()
      .replace(/\/+$/, "");
    if (url.includes("auth.fu.do")) {
      url = "https://api.fu.do/v1alpha1";
    }
    return url;
  }

  /**
   * Autenticación contra Fudo API o generación de token simulado para Sandbox
   */
  public async authenticate(forceRenew = false): Promise<{ token: string; expiresAt: string }> {
    if (!forceRenew && this.config.bearer_token && this.config.token_expires_at) {
      const expiresAtMs = new Date(this.config.token_expires_at).getTime();
      const now = Date.now();
      // Si aún es válido con al menos 5 minutos de margen
      if (expiresAtMs - now > 5 * 60 * 1000) {
        return {
          token: this.config.bearer_token,
          expiresAt: this.config.token_expires_at,
        };
      }
    }

    if (this.isSandbox()) {
      const mockToken = `fudo_demo_jwt_${Buffer.from(this.config.api_key || "demo").toString("base64")}_${Date.now()}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      updateFudoToken(mockToken, expiresAt);
      this.config.bearer_token = mockToken;
      this.config.token_expires_at = expiresAt;
      return { token: mockToken, expiresAt };
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
      expiresAt = new Date(data.exp * 1000).toISOString();
    } else if (typeof data.expiresIn === "number") {
      expiresAt = new Date(Date.now() + data.expiresIn * 1000).toISOString();
    } else {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    updateFudoToken(token, expiresAt);
    this.config.bearer_token = token;
    this.config.token_expires_at = expiresAt;

    return { token, expiresAt };
  }

  /**
   * Obtiene ventas cerradas y mapa de clientes incluidos desde Fudo API
   */
  public async fetchRawClosedSales(options?: {
    fromIso?: string;
    toIso?: string;
    limit?: number;
  }): Promise<{
    sales: FudoRawSale[];
    includedCustomers: Map<string, FudoRawCustomerAttributes>;
  }> {
    if (this.isSandbox()) {
      const sandboxSales = this.getSandboxSales(options?.fromIso);
      return {
        sales: sandboxSales,
        includedCustomers: new Map(),
      };
    }

    const auth = await this.authenticate();
    const baseUrl = this.getApiBaseUrl();
    const url = new URL(`${baseUrl}/sales`);

    url.searchParams.set("filter[saleState]", "in.(CLOSED,CANCELED)");
    url.searchParams.set("sort", "-createdAt");
    url.searchParams.set("page[size]", String(options?.limit || 250));
    url.searchParams.set("include", "customer");

    const formatFudoDate = (iso: string): string => {
      return new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");
    };

    if (options?.fromIso && options?.toIso) {
      url.searchParams.set(
        "filter[createdAt]",
        `and(gte.${formatFudoDate(options.fromIso)},lte.${formatFudoDate(options.toIso)})`
      );
    } else if (options?.fromIso) {
      url.searchParams.set("filter[createdAt]", `gte.${formatFudoDate(options.fromIso)}`);
    } else if (options?.toIso) {
      url.searchParams.set("filter[createdAt]", `lte.${formatFudoDate(options.toIso)}`);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error al consultar ventas de Fudo (${response.status}): ${err}`);
    }

    const json = (await response.json()) as FudoJsonApiResponse<FudoRawSale[]>;
    const rawSales = Array.isArray(json) ? json : json.data || [];

    const includedCustomers = new Map<string, FudoRawCustomerAttributes>();
    if (Array.isArray(json.included)) {
      for (const inc of json.included) {
        if (inc.type === "Customer" && inc.id) {
          includedCustomers.set(String(inc.id), (inc.attributes as FudoRawCustomerAttributes) || {});
        }
      }
    }

    return {
      sales: rawSales as FudoRawSale[],
      includedCustomers,
    };
  }

  /**
   * Obtiene un cliente por ID desde Fudo API
   */
  public async fetchRawCustomer(fudoCustomerId: string): Promise<FudoRawCustomer | null> {
    if (!fudoCustomerId) return null;

    if (this.isSandbox()) {
      return this.getSandboxCustomer(fudoCustomerId);
    }

    const auth = await this.authenticate();
    const baseUrl = this.getApiBaseUrl();
    const url = `${baseUrl}/customers/${encodeURIComponent(fudoCustomerId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
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

    const json = (await response.json()) as { data?: FudoRawCustomer };
    return (json.data || json) as FudoRawCustomer;
  }

  /**
   * Obtiene el directorio de clientes de Fudo API
   */
  public async fetchRawCustomers(options?: {
    activeOnly?: boolean;
    limit?: number;
    sort?: string;
  }): Promise<FudoRawCustomer[]> {
    if (this.isSandbox()) {
      return Object.values(this.getSandboxDirectory());
    }

    const auth = await this.authenticate();
    const baseUrl = this.getApiBaseUrl();
    const url = new URL(`${baseUrl}/customers`);

    if (options?.activeOnly !== false) {
      url.searchParams.set("filter[active]", "eq.true");
    }
    if (options?.sort) {
      url.searchParams.set("sort", options.sort);
    }
    url.searchParams.set("page[size]", String(options?.limit || 250));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error al consultar directorio de clientes en Fudo (${response.status}): ${err}`);
    }

    const json = (await response.json()) as FudoJsonApiResponse<FudoRawCustomer[]>;
    return (Array.isArray(json) ? json : json.data || []) as FudoRawCustomer[];
  }

  /**
   * Da de alta o actualiza un cliente en Fudo POS
   */
  public async postCustomerPayload(payload: {
    data: {
      type: "Customer";
      attributes: Record<string, unknown>;
    };
  }): Promise<FudoRawCustomer> {
    if (this.isSandbox()) {
      return this.createSandboxCustomer(payload.data.attributes);
    }

    const auth = await this.authenticate();
    const baseUrl = this.getApiBaseUrl();
    const url = `${baseUrl}/customers`;

    let response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      // Si rechazó algún atributo opcional, reintentar con campos mínimos esenciales
      const attrs = payload.data.attributes;
      if (response.status === 400 && (attrs.vatNumber || attrs.birthDate || attrs.address)) {
        const minimalPayload = {
          data: {
            type: "Customer",
            attributes: {
              name: attrs.name,
              active: true,
              phone: attrs.phone,
              email: attrs.email,
            },
          },
        };

        const retryRes = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(minimalPayload),
        });

        if (retryRes.ok) {
          response = retryRes;
        } else {
          const retryErr = await retryRes.text();
          throw new Error(`Error al dar de alta cliente en Fudo (${retryRes.status}): ${retryErr}`);
        }
      } else {
        throw new Error(`Error al dar de alta cliente en Fudo (${response.status}): ${err}`);
      }
    }

    const json = (await response.json()) as { data?: FudoRawCustomer };
    return (json.data || json) as FudoRawCustomer;
  }

  // --- Sandbox Simulator Helpers ---

  private createSandboxCustomer(attributes: Record<string, unknown>): FudoRawCustomer {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const mockId = `FUDO-CUST-${randomSuffix}`;

    return {
      id: mockId,
      type: "Customer",
      attributes: {
        name: String(attributes.name || "Comensal Demo").trim(),
        vatNumber:
          attributes.vatNumber !== undefined
            ? String(attributes.vatNumber)
            : `30${Math.floor(1000000 + Math.random() * 8999999)}`,
        phone: attributes.phone ? String(attributes.phone) : null,
        email: attributes.email ? String(attributes.email) : null,
        birthDate: attributes.birthDate ? String(attributes.birthDate) : null,
        address: attributes.address ? String(attributes.address) : null,
        active: true,
      },
    };
  }

  private getSandboxSales(fromIso?: string): FudoRawSale[] {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const dir = this.getSandboxDirectory();

    const mockSales: FudoRawSale[] = [
      {
        id: "FUDO-SALE-2001",
        attributes: {
          total: 32400.0,
          closedAt: new Date(now - 2 * oneHour).toISOString(),
          saleState: "CLOSED",
          saleType: "TABLE",
        },
        relationships: {
          customer: {
            data: { id: "FUDO-CUST-101", type: "Customer" },
          },
        },
      },
      {
        id: "FUDO-SALE-2002",
        attributes: {
          total: 14850.0,
          closedAt: new Date(now - 3.5 * oneHour).toISOString(),
          saleState: "CLOSED",
          saleType: "COUNTER",
        },
        relationships: {
          customer: {
            data: { id: "FUDO-CUST-102", type: "Customer" },
          },
        },
      },
      {
        id: "FUDO-SALE-2003",
        attributes: {
          total: 54200.0,
          closedAt: new Date(now - 5 * oneHour).toISOString(),
          saleState: "CLOSED",
          saleType: "TABLE",
        },
        relationships: {
          customer: {
            data: { id: "FUDO-CUST-103", type: "Customer" },
          },
        },
      },
      {
        id: "FUDO-SALE-2004",
        attributes: {
          total: 22600.0,
          closedAt: new Date(now - 6.5 * oneHour).toISOString(),
          saleState: "CLOSED",
          saleType: "DELIVERY",
          anonymousCustomer: {
            name: "Marina Sola",
            phone: "+5491188776655",
          },
        },
      },
      {
        id: "FUDO-SALE-2005",
        attributes: {
          total: 19500.0,
          closedAt: new Date(now - 24 * oneHour).toISOString(),
          saleState: "CLOSED",
          saleType: "TABLE",
        },
        relationships: {
          customer: {
            data: { id: "FUDO-CUST-101", type: "Customer" },
          },
        },
      },
      {
        id: "FUDO-SALE-2006",
        attributes: {
          total: 8200.0,
          closedAt: new Date(now - 28 * oneHour).toISOString(),
          saleState: "CLOSED",
          saleType: "COUNTER",
        },
      },
    ];

    if (!fromIso) {
      return mockSales;
    }

    const fromTime = new Date(fromIso).getTime();
    return mockSales.filter((s) => {
      const saleTime = new Date(s.attributes?.closedAt || "").getTime();
      return saleTime >= fromTime;
    });
  }

  private getSandboxCustomer(id: string): FudoRawCustomer | null {
    const dir = this.getSandboxDirectory();
    return dir[id] || null;
  }

  private getSandboxDirectory(): Record<string, FudoRawCustomer> {
    return {
      "FUDO-CUST-101": {
        id: "FUDO-CUST-101",
        attributes: {
          name: "Esteban Morales",
          vatNumber: "32111222",
          phone: "+5491144332211",
          email: "esteban.morales@gmail.com",
          birthDate: "1988-06-14",
          address: "Av. Corrientes 1420, CABA",
          active: true,
        },
      },
      "FUDO-CUST-102": {
        id: "FUDO-CUST-102",
        attributes: {
          name: "Valeria Gourmet",
          vatNumber: "27356667771",
          phone: "+5491199887766",
          email: "valeria.g@hotmail.com",
          birthDate: "1992-10-01",
          address: "Gorriti 4800, Palermo",
          active: true,
        },
      },
      "FUDO-CUST-103": {
        id: "FUDO-CUST-103",
        attributes: {
          name: "Agustín Vignoli",
          vatNumber: "20389998884",
          phone: "+5491155443322",
          email: "agustin.vignoli@outlook.com",
          birthDate: "1995-12-05",
          address: "Thames 1600, Palermo Soho",
          active: true,
        },
      },
      "FUDO-CUST-104": {
        id: "FUDO-CUST-104",
        attributes: {
          name: "Marina Sola",
          vatNumber: "27401112223",
          phone: "+5491188776655",
          email: "marina.sola@yahoo.com",
          birthDate: "1998-03-22",
          address: "Honduras 5100, CABA",
          active: true,
        },
      },
      "FUDO-CUST-105": {
        id: "FUDO-CUST-105",
        attributes: {
          name: "Lucía Benítez",
          vatNumber: "27398887776",
          phone: "+5491133221100",
          email: "lucia.benitez@gmail.com",
          birthDate: "1994-08-19",
          address: "Malabia 1250, Villa Crespo",
          active: true,
        },
      },
    };
  }
}
