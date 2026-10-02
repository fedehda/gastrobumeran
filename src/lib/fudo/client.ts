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

    // 1. Strict OpenAPI filter: filter[saleState]=in.(CLOSED,CANCELED)
    url.searchParams.set("filter[saleState]", "in.(CLOSED,CANCELED)");

    // 2. Strict OpenAPI sort: newest sales first
    url.searchParams.set("sort", "-createdAt");

    // 3. Strict OpenAPI paging: get max items per page
    url.searchParams.set("page[size]", "250");

    // 4. Strict OpenAPI include: include customer relationship data
    url.searchParams.set("include", "customer");

    // 5. Strict OpenAPI date filtering: regex ^(gte|lte)\.\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z)?
    const formatFudoDate = (iso: string): string => {
      return new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");
    };

    if (fromIso && toIso) {
      url.searchParams.set(
        "filter[createdAt]",
        `and(gte.${formatFudoDate(fromIso)},lte.${formatFudoDate(toIso)})`
      );
    } else if (fromIso) {
      url.searchParams.set("filter[createdAt]", `gte.${formatFudoDate(fromIso)}`);
    } else if (toIso) {
      url.searchParams.set("filter[createdAt]", `lte.${formatFudoDate(toIso)}`);
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

    // Parse included customers map if available in JSON:API response
    const includedCustomers = new Map<
      string,
      {
        name: string;
        vatNumber?: string | null;
        phone?: string | null;
        email?: string | null;
      }
    >();

    if (Array.isArray(json.included)) {
      for (const inc of json.included) {
        if (inc.type === "Customer" && inc.id) {
          const iAttrs = (inc.attributes as Record<string, unknown>) || {};
          includedCustomers.set(String(inc.id), {
            name: String(iAttrs.name || ""),
            vatNumber:
              iAttrs.vatNumber || iAttrs.fiscalNumber || iAttrs.cuit || iAttrs.dni
                ? String(iAttrs.vatNumber || iAttrs.fiscalNumber || iAttrs.cuit || iAttrs.dni)
                : null,
            phone: iAttrs.phone ? String(iAttrs.phone) : null,
            email: iAttrs.email ? String(iAttrs.email) : null,
          });
        }
      }
    }

    // Normalize sales to FudoSale interface (supports JSON:API attributes/relationships as well as flat fields)
    return rawSales.map((s: Record<string, unknown>) => {
      const attrs = (s.attributes as Record<string, unknown>) || {};
      const rels = (s.relationships as Record<string, unknown>) || {};
      const custRel = (rels.customer as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const anon = (attrs.anonymousCustomer as Record<string, unknown>) || undefined;

      const custId = custRel?.id
        ? String(custRel.id)
        : s.customerId
        ? String(s.customerId)
        : s.customer_id
        ? String(s.customer_id)
        : null;

      const incData = custId ? includedCustomers.get(custId) : undefined;

      let resolvedType: "TABLE" | "COUNTER" | "DELIVERY" = "TABLE";
      const rawSaleType = String(attrs.saleType || attrs.type || s.type || "").toUpperCase();
      if (
        rawSaleType.includes("TAKEAWAY") ||
        rawSaleType.includes("COUNTER") ||
        rawSaleType.includes("MOSTRADOR") ||
        rawSaleType.includes("PICKUP")
      ) {
        resolvedType = "COUNTER";
      } else if (rawSaleType.includes("DELIVERY") || rawSaleType.includes("ENVIO")) {
        resolvedType = "DELIVERY";
      } else {
        resolvedType = "TABLE";
      }

      return {
        id: String(s.id),
        total: Number(attrs.total ?? s.total ?? s.totalAmount ?? s.amount ?? 0),
        createdAt: String(attrs.closedAt || attrs.createdAt || s.createdAt || s.date || new Date().toISOString()),
        status: ((attrs.saleState || attrs.status || s.status) as "CLOSED" | "OPEN" | "CANCELED") || "CLOSED",
        type: resolvedType,
        customerId: custId,
        customerName:
          incData?.name ||
          (attrs.customerName ? String(attrs.customerName) : anon?.name ? String(anon.name) : null),
        customerPhone: incData?.phone || (anon?.phone ? String(anon.phone) : null),
        customerDocument: incData?.vatNumber || null,
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
        attrs.vatNumber || attrs.fiscalNumber || attrs.cuit || attrs.dni || attrs.taxId
          ? String(attrs.vatNumber || attrs.fiscalNumber || attrs.cuit || attrs.dni || attrs.taxId)
          : null,
      phone: attrs.phone ? String(attrs.phone) : null,
      email: attrs.email ? String(attrs.email) : null,
      birthDate: attrs.birthDate ? String(attrs.birthDate) : null,
      address: attrs.address ? String(attrs.address) : null,
    };
  }

  /**
   * Fetches customer directory from Fudo API or sandbox
   */
  public async getCustomers(options?: { activeOnly?: boolean; limit?: number }): Promise<FudoCustomer[]> {
    if (this.isSandbox()) {
      return Object.values(this.getSandboxDirectory());
    }

    const token = await this.authenticate();
    const baseUrl = this.getApiBaseUrl();
    const url = new URL(`${baseUrl}/customers`);

    if (options?.activeOnly !== false) {
      url.searchParams.set("filter[active]", "eq.true");
    }
    url.searchParams.set("sort", "-createdAt");
    url.searchParams.set("page[size]", String(options?.limit || 250));

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
      throw new Error(`Error al consultar directorio de clientes en Fudo (${response.status}): ${err}`);
    }

    const json = await response.json();
    const rawData = Array.isArray(json) ? json : json.data || [];

    return rawData.map((item: Record<string, unknown>) => {
      const attrs = (item.attributes as Record<string, unknown>) || item;
      return {
        id: String(item.id),
        name: String(attrs.name || "Comensal Fudo"),
        fiscalNumber:
          attrs.vatNumber || attrs.fiscalNumber || attrs.cuit || attrs.dni || attrs.taxId
            ? String(attrs.vatNumber || attrs.fiscalNumber || attrs.cuit || attrs.dni || attrs.taxId)
            : null,
        phone: attrs.phone ? String(attrs.phone) : null,
        email: attrs.email ? String(attrs.email) : null,
        birthDate: attrs.birthDate ? String(attrs.birthDate) : null,
        address: attrs.address ? String(attrs.address) : null,
      };
    });
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
    birthDate?: string | null;
  }): Promise<FudoCustomer> {
    if (this.isSandbox()) {
      return this.createSandboxCustomer(customerData);
    }

    const token = await this.authenticate();
    const baseUrl = this.getApiBaseUrl();
    const url = `${baseUrl}/customers`;

    const attributes: Record<string, unknown> = {
      name: customerData.name.trim().slice(0, 90),
      active: true,
    };

    if (customerData.documentNumber?.trim()) {
      attributes.vatNumber = customerData.documentNumber.trim().slice(0, 45);
    }

    if (customerData.phone?.trim()) {
      attributes.phone = customerData.phone.trim().slice(0, 45);
    }

    if (customerData.email?.trim()) {
      const emailTrim = customerData.email.trim().slice(0, 90);
      if (emailTrim.includes("@") && emailTrim.includes(".")) {
        attributes.email = emailTrim;
      }
    }

    if (customerData.address?.trim()) {
      attributes.address = customerData.address.trim();
    }

    if (customerData.birthDate?.trim()) {
      const bday = customerData.birthDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(bday)) {
        attributes.birthDate = bday;
      } else if (/^\d{2}-\d{2}$/.test(bday)) {
        attributes.birthDate = `2000-${bday}`;
      }
    }

    // Standard JSON:API payload compliant with official Fudo OpenAPI spec (type: "Customer")
    const jsonApiPayload = {
      data: {
        type: "Customer",
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
      const err = await response.text();
      // If optional attribute was rejected, retry with minimal core fields (name, active, phone, email)
      if (response.status === 400 && (attributes.vatNumber || attributes.birthDate || attributes.address)) {
        const minimalAttributes: Record<string, unknown> = {
          name: attributes.name,
          active: true,
        };
        if (attributes.phone) minimalAttributes.phone = attributes.phone;
        if (attributes.email) minimalAttributes.email = attributes.email;

        const retryRes = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            data: {
              type: "Customer",
              attributes: minimalAttributes,
            },
          }),
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

    const json = await response.json();
    const data = (json.data || json) as Record<string, unknown>;
    const attrs = (data.attributes as Record<string, unknown>) || data;

    return {
      id: String(data.id),
      name: String(attrs.name || customerData.name),
      fiscalNumber:
        attrs.vatNumber || attrs.fiscalNumber || attrs.cuit || attrs.dni
          ? String(attrs.vatNumber || attrs.fiscalNumber || attrs.cuit || attrs.dni)
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

    const dir = this.getSandboxDirectory();
    const mockSales: FudoSale[] = [
      {
        id: "FUDO-SALE-2001",
        total: 32400.0,
        createdAt: new Date(now - 2 * oneHour).toISOString(),
        status: "CLOSED",
        type: "TABLE",
        customerId: "FUDO-CUST-101",
        customerName: dir["FUDO-CUST-101"]?.name,
        customerDocument: dir["FUDO-CUST-101"]?.fiscalNumber,
        customerPhone: dir["FUDO-CUST-101"]?.phone,
      },
      {
        id: "FUDO-SALE-2002",
        total: 14850.0,
        createdAt: new Date(now - 3.5 * oneHour).toISOString(),
        status: "CLOSED",
        type: "COUNTER",
        customerId: "FUDO-CUST-102",
        customerName: dir["FUDO-CUST-102"]?.name,
        customerDocument: dir["FUDO-CUST-102"]?.fiscalNumber,
        customerPhone: dir["FUDO-CUST-102"]?.phone,
      },
      {
        id: "FUDO-SALE-2003",
        total: 54200.0,
        createdAt: new Date(now - 5 * oneHour).toISOString(),
        status: "CLOSED",
        type: "TABLE",
        customerId: "FUDO-CUST-103",
        customerName: dir["FUDO-CUST-103"]?.name,
        customerDocument: dir["FUDO-CUST-103"]?.fiscalNumber,
        customerPhone: dir["FUDO-CUST-103"]?.phone,
      },
      {
        id: "FUDO-SALE-2004",
        total: 22600.0,
        createdAt: new Date(now - 6.5 * oneHour).toISOString(),
        status: "CLOSED",
        type: "DELIVERY",
        customerId: "FUDO-CUST-104",
        customerName: dir["FUDO-CUST-104"]?.name,
        customerDocument: dir["FUDO-CUST-104"]?.fiscalNumber,
        customerPhone: dir["FUDO-CUST-104"]?.phone,
      },
      {
        id: "FUDO-SALE-2005",
        total: 19500.0,
        createdAt: new Date(now - 24 * oneHour).toISOString(),
        status: "CLOSED",
        type: "TABLE",
        customerId: "FUDO-CUST-101", // Recompra de Esteban Morales
        customerName: dir["FUDO-CUST-101"]?.name,
        customerDocument: dir["FUDO-CUST-101"]?.fiscalNumber,
        customerPhone: dir["FUDO-CUST-101"]?.phone,
      },
      {
        id: "FUDO-SALE-2006",
        total: 8200.0,
        createdAt: new Date(now - 28 * oneHour).toISOString(),
        status: "CLOSED",
        type: "COUNTER",
        customerId: "FUDO-CUST-105",
        customerName: dir["FUDO-CUST-105"]?.name,
        customerDocument: dir["FUDO-CUST-105"]?.fiscalNumber,
        customerPhone: dir["FUDO-CUST-105"]?.phone,
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

  public getSandboxDirectory(): Record<string, FudoCustomer> {
    return {
      "FUDO-CUST-101": {
        id: "FUDO-CUST-101",
        name: "Esteban Morales",
        fiscalNumber: "32111222",
        phone: "+5491144332211",
        email: "esteban.morales@gmail.com",
        birthDate: "1988-06-15",
      },
      "FUDO-CUST-102": {
        id: "FUDO-CUST-102",
        name: "Florencia Varela",
        fiscalNumber: "38999888",
        phone: "+5491188776655",
        email: "flor.varela@hotmail.com",
        birthDate: "1994-09-22",
      },
      "FUDO-CUST-103": {
        id: "FUDO-CUST-103",
        name: "Gonzalo Peñaloza",
        fiscalNumber: "29444555",
        phone: "+5491133221100",
        email: "gonzalo.p@gmail.com",
        birthDate: "1982-03-10",
      },
      "FUDO-CUST-104": {
        id: "FUDO-CUST-104",
        name: "Camila Rossi",
        fiscalNumber: "36555444",
        phone: "+5491166554433",
        email: "camila.rossi@yahoo.com",
        birthDate: "1991-11-05",
      },
      "FUDO-CUST-105": {
        id: "FUDO-CUST-105",
        name: "Martín Benítez",
        fiscalNumber: "41222333",
        phone: "+5491177889900",
        email: "martin.b@outlook.com",
        birthDate: "1998-01-30",
      },
    };
  }

  private getSandboxCustomer(fudoCustomerId: string): FudoCustomer {
    const dir = this.getSandboxDirectory();
    return (
      dir[fudoCustomerId] || {
        id: fudoCustomerId,
        name: `Cliente Fudo (${fudoCustomerId})`,
        fiscalNumber: `99${Math.floor(100000 + Math.random() * 900000)}`,
        phone: "+5491100001111",
        email: `cliente.${fudoCustomerId.toLowerCase()}@fudo.test`,
      }
    );
  }
}
