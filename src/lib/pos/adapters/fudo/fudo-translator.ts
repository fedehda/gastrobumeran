import {
  CanonicalSale,
  CanonicalCustomer,
  CanonicalEvent,
  CanonicalSaleType,
  CanonicalSaleStatus,
} from "../../core/types";
import {
  FudoRawSale,
  FudoRawCustomer,
  FudoRawCustomerAttributes,
  FudoWebhookPayload,
} from "./types";

export class FudoTranslator {
  /**
   * Normaliza los tipos de comanda de Fudo al estándar de GastroBumeran (TABLE | COUNTER | DELIVERY)
   */
  public static normalizeSaleType(rawType: string): CanonicalSaleType {
    const clean = (rawType || "").toUpperCase();
    if (
      clean.includes("TAKEAWAY") ||
      clean.includes("COUNTER") ||
      clean.includes("MOSTRADOR") ||
      clean.includes("PICKUP")
    ) {
      return "COUNTER";
    }
    if (clean.includes("DELIVERY") || clean.includes("ENVIO")) {
      return "DELIVERY";
    }
    return "TABLE";
  }

  /**
   * Normaliza el estado de venta de Fudo
   */
  public static normalizeSaleStatus(rawStatus: string): CanonicalSaleStatus {
    const clean = (rawStatus || "").toUpperCase();
    if (clean.includes("CANCEL") || clean.includes("ANULAD")) {
      return "CANCELED";
    }
    if (clean.includes("OPEN") || clean.includes("ABIERTA")) {
      return "OPEN";
    }
    return "CLOSED";
  }

  /**
   * Traduce una venta en formato nativo JSON:API o plano de Fudo a CanonicalSale
   */
  public static toCanonicalSale(
    raw: FudoRawSale,
    includedMap?: Map<string, FudoRawCustomerAttributes>
  ): CanonicalSale {
    const attrs = (raw.attributes as Record<string, unknown>) || {};
    const rels = (raw.relationships as Record<string, unknown>) || {};
    const custRel = (rels.customer as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    const anon = (attrs.anonymousCustomer as Record<string, unknown>) || undefined;

    const custId = custRel?.id
      ? String(custRel.id)
      : raw.customerId
      ? String(raw.customerId)
      : raw.customer_id
      ? String(raw.customer_id)
      : null;

    const incData = custId && includedMap ? includedMap.get(custId) : undefined;

    const rawType = String(attrs.saleType || attrs.type || raw.typeField || "");
    const saleType = this.normalizeSaleType(rawType);

    const rawStatus = String(attrs.saleState || attrs.status || raw.status || "CLOSED");
    const status = this.normalizeSaleStatus(rawStatus);

    const totalAmount = Number(
      attrs.total ?? raw.total ?? attrs.totalAmount ?? attrs.amount ?? 0
    );

    const saleDate = String(
      attrs.closedAt || attrs.createdAt || raw.createdAt || new Date().toISOString()
    );

    const customerDoc =
      incData?.vatNumber ||
      incData?.fiscalNumber ||
      incData?.cuit ||
      incData?.dni ||
      (attrs.vatNumber ? String(attrs.vatNumber) : null) ||
      (attrs.fiscalNumber ? String(attrs.fiscalNumber) : null) ||
      (attrs.cuit ? String(attrs.cuit) : null) ||
      (attrs.dni ? String(attrs.dni) : null) ||
      null;

    const customerName =
      incData?.name ||
      (attrs.customerName ? String(attrs.customerName) : anon?.name ? String(anon.name) : null);

    const customerPhone =
      incData?.phone ||
      (attrs.phone ? String(attrs.phone) : null) ||
      (anon?.phone ? String(anon.phone) : null);
    const customerEmail =
      incData?.email ||
      (attrs.email ? String(attrs.email) : null);

    return {
      externalSaleId: String(raw.id),
      provider: "FUDO",
      totalAmount,
      saleDate,
      status,
      saleType,
      customer: {
        externalId: custId,
        documentNumber: customerDoc ? String(customerDoc).trim() : null,
        name: customerName ? String(customerName).trim() : null,
        phone: customerPhone ? String(customerPhone).trim() : null,
        email: customerEmail ? String(customerEmail).trim() : null,
      },
      concept: `Venta Fudo #${raw.id} (${saleType === "TABLE" ? "Mesa" : saleType === "COUNTER" ? "Mostrador" : "Delivery"})`,
      rawPayload: raw,
    };
  }

  /**
   * Traduce un cliente de Fudo a CanonicalCustomer
   */
  public static toCanonicalCustomer(raw: FudoRawCustomer): CanonicalCustomer {
    const attrs = (raw.attributes as Record<string, unknown>) || raw;

    const doc =
      attrs.vatNumber ||
      attrs.fiscalNumber ||
      attrs.cuit ||
      attrs.dni ||
      attrs.taxId ||
      null;

    return {
      externalId: String(raw.id),
      provider: "FUDO",
      name: String(attrs.name || "Comensal Fudo").trim(),
      documentNumber: doc ? String(doc).trim() : null,
      phone: attrs.phone ? String(attrs.phone).trim() : null,
      email: attrs.email ? String(attrs.email).trim() : null,
      birthDate: attrs.birthDate ? String(attrs.birthDate).trim() : null,
      address: attrs.address ? String(attrs.address).trim() : null,
      rawPayload: raw,
    };
  }

  /**
   * Traduce un CanonicalCustomer al payload JSON:API que espera Fudo POS
   */
  public static toFudoCustomerPayload(
    customer: Partial<CanonicalCustomer>
  ): {
    data: {
      type: "Customer";
      attributes: Record<string, unknown>;
    };
  } {
    const attributes: Record<string, unknown> = {
      name: (customer.name || "").trim().slice(0, 90),
      active: true,
    };

    if (customer.documentNumber?.trim()) {
      attributes.vatNumber = customer.documentNumber.trim().slice(0, 45);
    }

    if (customer.phone?.trim()) {
      attributes.phone = customer.phone.trim().slice(0, 45);
    }

    if (customer.email?.trim()) {
      const email = customer.email.trim().slice(0, 90);
      if (email.includes("@") && email.includes(".")) {
        attributes.email = email;
      }
    }

    if (customer.address?.trim()) {
      attributes.address = customer.address.trim();
    }

    if (customer.birthDate?.trim()) {
      const bday = customer.birthDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(bday)) {
        attributes.birthDate = bday;
      } else if (/^\d{2}-\d{2}$/.test(bday)) {
        attributes.birthDate = `2000-${bday}`;
      }
    }

    return {
      data: {
        type: "Customer",
        attributes,
      },
    };
  }

  /**
   * Traduce un webhook o evento entrante en tiempo real a CanonicalEvent
   */
  public static toCanonicalEvent(
    payload: unknown,
    headers?: Record<string, string>
  ): CanonicalEvent | null {
    if (!payload || typeof payload !== "object") return null;

    const p = payload as FudoWebhookPayload;
    const actionOrEvent = String(p.event || p.action || headers?.["x-fudo-event"] || "").toLowerCase();

    // Eventos de Venta
    if (actionOrEvent.includes("sale") || actionOrEvent.includes("order") || p.entity === "sale") {
      const rawSale = (p.data || p) as FudoRawSale;
      if (!rawSale.id) return null;

      const canonicalSale = this.toCanonicalSale(rawSale);
      const isCanceled =
        actionOrEvent.includes("cancel") ||
        actionOrEvent.includes("void") ||
        canonicalSale.status === "CANCELED";

      return {
        eventType: isCanceled ? "SALE_CANCELED" : "SALE_CLOSED",
        provider: "FUDO",
        timestamp: p.timestamp || new Date().toISOString(),
        sale: canonicalSale,
        rawPayload: payload,
      };
    }

    // Eventos de Cliente
    if (actionOrEvent.includes("customer") || p.entity === "customer") {
      const rawCust = (p.data || p) as FudoRawCustomer;
      if (!rawCust.id) return null;

      const canonicalCustomer = this.toCanonicalCustomer(rawCust);
      return {
        eventType: actionOrEvent.includes("update") ? "CUSTOMER_UPDATED" : "CUSTOMER_CREATED",
        provider: "FUDO",
        timestamp: p.timestamp || new Date().toISOString(),
        customer: canonicalCustomer,
        rawPayload: payload,
      };
    }

    // Ping o Heartbeat de prueba
    if (actionOrEvent.includes("ping") || actionOrEvent.includes("test")) {
      return {
        eventType: "PING",
        provider: "FUDO",
        timestamp: new Date().toISOString(),
        rawPayload: payload,
      };
    }

    // Fallback: Si el payload contiene un id y un total, considerarlo venta cerrada
    const fallbackObj = payload as Record<string, unknown>;
    if (fallbackObj.id && (fallbackObj.total !== undefined || fallbackObj.totalAmount !== undefined)) {
      return {
        eventType: "SALE_CLOSED",
        provider: "FUDO",
        timestamp: new Date().toISOString(),
        sale: this.toCanonicalSale(fallbackObj as unknown as FudoRawSale),
        rawPayload: payload,
      };
    }

    return null;
  }
}
