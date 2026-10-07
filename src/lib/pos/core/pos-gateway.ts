import { getDatabase } from "@/lib/db/db";
import { getFudoConfig, updateFudoLastSync } from "@/lib/db/fudo-repo";
import {
  findCustomerByDocument,
  findCustomerByPhone,
  findCustomerByPosId,
  linkCustomerPosId,
  createCustomer,
} from "@/lib/db/customer-repo";
import { processSale, cancelSale } from "@/lib/loyalty/engine";
import { Customer } from "@/types/loyalty";
import { isLegalEntityCuit } from "@/lib/validation/cuit";
import { IPosAdapter } from "./pos-adapter.interface";
import { FudoAdapter } from "../adapters/fudo/fudo-adapter";
import {
  CanonicalSale,
  CanonicalCustomer,
  CanonicalEvent,
  PosProviderType,
  PosSyncOptions,
  PosSyncResult,
} from "./types";
import { posEventBus } from "../real-time/event-bus";

export class PosGateway {
  private static instance: PosGateway;
  private adapters = new Map<PosProviderType, IPosAdapter>();

  private constructor() {
    // Registrar adaptador de Fudo por defecto
    this.registerAdapter(new FudoAdapter());
  }

  public static getInstance(): PosGateway {
    if (!PosGateway.instance) {
      PosGateway.instance = new PosGateway();
    }
    return PosGateway.instance;
  }

  public registerAdapter(adapter: IPosAdapter): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  public getAdapter(provider: PosProviderType = "FUDO"): IPosAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Proveedor POS '${provider}' no soportado o no registrado.`);
    }
    return adapter;
  }

  public getRegisteredProviders(): Array<{ providerId: PosProviderType; displayName: string }> {
    return Array.from(this.adapters.values()).map((a) => ({
      providerId: a.providerId,
      displayName: a.displayName,
    }));
  }

  /**
   * Sincroniza el directorio de comensales desde el POS hacia GastroBumeran
   */
  public async syncCustomers(
    provider: PosProviderType = "FUDO"
  ): Promise<{ total: number; importedCount: number; updatedCount: number }> {
    const adapter = this.getAdapter(provider);
    let posCustomers: CanonicalCustomer[] = [];

    try {
      posCustomers = await adapter.fetchCustomers({ activeOnly: true });
    } catch (error) {
      console.warn(`No se pudo obtener directorio de clientes desde ${provider}:`, error);
      return { total: 0, importedCount: 0, updatedCount: 0 };
    }

    let importedCount = 0;
    let updatedCount = 0;

    for (const pc of posCustomers) {
      try {
        const doc = pc.documentNumber ? pc.documentNumber.trim() : null;
        if (doc && isLegalEntityCuit(doc)) {
          console.log(`[PosGateway] Omitiendo cliente corporativo ${pc.name || pc.externalId} con CUIT ${doc} (Personas jurídicas excluidas)`);
          continue;
        }

        let existing: Customer | null = findCustomerByPosId(provider, pc.externalId);

        if (!existing && doc) {
          existing = findCustomerByDocument(doc);
        }

        if (!existing && pc.phone) {
          existing = findCustomerByPhone(pc.phone);
        }

        if (existing) {
          if (isLegalEntityCuit(existing.document_number)) {
            continue;
          }
          linkCustomerPosId(existing.id, provider, pc.externalId);
          updatedCount++;
        } else {
          createCustomer({
            fudo_customer_id: provider === "FUDO" ? pc.externalId : undefined,
            document_number: doc || pc.externalId,
            name: pc.name || `Comensal ${provider} #${pc.externalId}`,
            phone: pc.phone,
            email: pc.email,
            birth_date: pc.birthDate,
            loyalty_enrolled: 0,
          });
          importedCount++;
        }
      } catch (err) {
        console.warn(`Error al importar cliente ${pc.externalId} de ${provider}:`, err);
      }
    }

    return {
      total: posCustomers.length,
      importedCount,
      updatedCount,
    };
  }

  /**
   * Ejecuta sincronización de ventas y clientes con el sistema POS activo
   */
  public async syncSales(options?: PosSyncOptions): Promise<PosSyncResult> {
    const provider = options?.provider || "FUDO";
    const adapter = this.getAdapter(provider);

    const config = getFudoConfig();
    const fromIso = options?.fullSync ? undefined : options?.fromIso || config.last_sync_at || undefined;
    const syncStartTime = new Date().toISOString();

    const errors: string[] = [];
    let syncedCount = 0;
    let duplicatedCount = 0;
    let canceledCount = 0;
    let unassignedCount = 0;
    const newCustomersCount = 0;
    let importedCustomersCount = 0;
    let updatedCustomersCount = 0;
    let totalPointsEarned = 0;
    let totalAmountProcessed = 0;

    // 1. Sincronización de comensales opcional
    if (options?.syncCustomers !== false && adapter.getCapabilities().supportsCustomerDirectory) {
      try {
        const custSync = await this.syncCustomers(provider);
        importedCustomersCount = custSync.importedCount;
        updatedCustomersCount = custSync.updatedCount;
      } catch (custErr) {
        const msg = custErr instanceof Error ? custErr.message : String(custErr);
        errors.push(`Aviso al sincronizar clientes: ${msg}`);
      }
    }

    // 2. Consulta de ventas al POS
    let sales: CanonicalSale[] = [];
    try {
      sales = await adapter.fetchClosedSales({
        since: fromIso,
        until: options?.toIso,
        limit: options?.limit,
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      errors.push(`Error al conectar con ${provider}: ${msg}`);
      return {
        provider,
        totalRetrieved: 0,
        syncedCount: 0,
        duplicatedCount: 0,
        canceledCount: 0,
        unassignedCount: 0,
        newCustomersCount: importedCustomersCount,
        importedCustomersCount,
        updatedCustomersCount,
        totalPointsEarned: 0,
        totalAmountProcessed: 0,
        errors,
        lastSyncAt: config.last_sync_at || syncStartTime,
      };
    }

    // 3. Procesar cada venta canónica mediante el motor unificado de ingesta
    for (const sale of sales) {
      try {
        const ingestRes = await this.ingestCanonicalSale(sale, provider);
        if (ingestRes.status === "INGESTED") {
          syncedCount++;
          totalPointsEarned += ingestRes.pointsEarned || 0;
          totalAmountProcessed += sale.totalAmount;
        } else if (ingestRes.status === "DUPLICATED") {
          duplicatedCount++;
        } else if (ingestRes.status === "CANCELED") {
          canceledCount++;
        } else if (ingestRes.status === "UNASSIGNED") {
          unassignedCount++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Error en venta ${sale.externalSaleId}: ${msg}`);
      }
    }

    if (unassignedCount > 0) {
      errors.push(
        `Información: ${unassignedCount} venta(s) cerrada(s) no tenían comensal asociado en ${adapter.displayName} (se omitieron para no emitir puntos a consumidor final anónimo).`
      );
    }

    if (provider === "FUDO") {
      updateFudoLastSync(syncStartTime);
    }

    return {
      provider,
      totalRetrieved: sales.length,
      syncedCount,
      duplicatedCount,
      canceledCount,
      unassignedCount,
      newCustomersCount: newCustomersCount + importedCustomersCount,
      importedCustomersCount,
      updatedCustomersCount,
      totalPointsEarned,
      totalAmountProcessed,
      errors,
      lastSyncAt: syncStartTime,
    };
  }

  /**
   * Ingesta atómica e idempotente de una venta canónica en el motor de fidelización
   */
  public async ingestCanonicalSale(
    sale: CanonicalSale,
    provider: PosProviderType = "FUDO"
  ): Promise<{
    status: "INGESTED" | "DUPLICATED" | "CANCELED" | "UNASSIGNED";
    pointsEarned?: number;
    saleId?: string;
  }> {
    const db = getDatabase();
    const adapter = this.getAdapter(provider);

    // 1. Idempotencia y anulación
    const existing = db
      .prepare("SELECT id, status FROM sales WHERE external_sale_id = ?")
      .get(sale.externalSaleId) as { id: string; status: string } | undefined;

    if (sale.status === "CANCELED") {
      if (existing && existing.status !== "CANCELED") {
        cancelSale(existing.id, `Anulación sincronizada desde ${adapter.displayName}`);
        posEventBus.emitNotification({
          id: `cancel-${sale.externalSaleId}-${Date.now()}`,
          type: "SALE_CANCELED",
          provider,
          timestamp: new Date().toISOString(),
          sale,
          message: `Venta #${sale.externalSaleId} anulada en ${adapter.displayName}. Puntos revertidos.`,
        });
        return { status: "CANCELED", saleId: existing.id };
      }
      return { status: "CANCELED" };
    }

    if (existing) {
      return { status: "DUPLICATED", saleId: existing.id };
    }

    // 2. Resolución de comensal
    // Si la venta tiene asociado un CUIT corporativo / Factura A a empresa, se excluye de fidelización
    if (sale.customer?.documentNumber && isLegalEntityCuit(sale.customer.documentNumber)) {
      console.log(`[PosGateway] Venta #${sale.externalSaleId} emitida a persona jurídica (CUIT ${sale.customer.documentNumber}). Excluida del programa de fidelización.`);
      return { status: "UNASSIGNED" };
    }

    let customer: Customer | null = null;

    if (sale.customer?.externalId) {
      customer = findCustomerByPosId(provider, sale.customer.externalId);
    }

    if (!customer && sale.customer?.documentNumber) {
      customer = findCustomerByDocument(sale.customer.documentNumber);
      if (customer && sale.customer.externalId) {
        linkCustomerPosId(customer.id, provider, sale.customer.externalId);
      }
    }

    if (!customer && sale.customer?.phone) {
      customer = findCustomerByPhone(sale.customer.phone);
      if (customer && sale.customer.externalId) {
        linkCustomerPosId(customer.id, provider, sale.customer.externalId);
      }
    }

    // Si el cliente existente en DB corresponde a una empresa/persona jurídica, no sumar puntos
    if (customer && isLegalEntityCuit(customer.document_number)) {
      console.log(`[PosGateway] Cliente #${customer.id} (${customer.name}) es persona jurídica (CUIT ${customer.document_number}). Venta excluida de fidelización.`);
      return { status: "UNASSIGNED" };
    }

    if (!customer && sale.customer?.externalId && adapter.getCapabilities().supportsCustomerDirectory) {
      try {
        const fetched = await adapter.fetchCustomer(sale.customer.externalId);
        if (fetched) {
          const docNumber = (fetched.documentNumber || fetched.externalId).trim();
          if (isLegalEntityCuit(docNumber)) {
            console.log(`[PosGateway] Cliente POS #${sale.customer.externalId} es persona jurídica (CUIT ${docNumber}). Excluido de fidelización.`);
            return { status: "UNASSIGNED" };
          }

          const existingByDoc = findCustomerByDocument(docNumber);
          if (existingByDoc) {
            if (isLegalEntityCuit(existingByDoc.document_number)) {
              return { status: "UNASSIGNED" };
            }
            linkCustomerPosId(existingByDoc.id, provider, fetched.externalId);
            customer = existingByDoc;
          } else {
            customer = createCustomer({
              fudo_customer_id: provider === "FUDO" ? fetched.externalId : undefined,
              document_number: docNumber,
              name: fetched.name || `Comensal ${provider} #${fetched.externalId}`,
              phone: fetched.phone || sale.customer?.phone,
              email: fetched.email,
              birth_date: fetched.birthDate,
              loyalty_enrolled: 0,
            });
          }
        }
      } catch (fetchCustErr) {
        console.warn(`No se pudo obtener detalle del cliente ${sale.customer.externalId}:`, fetchCustErr);
      }
    }

    if (!customer && (sale.customer?.documentNumber || (sale.customer?.phone && sale.customer?.name))) {
      const docNumber = sale.customer.documentNumber || sale.customer.phone!;
      if (isLegalEntityCuit(docNumber)) {
        return { status: "UNASSIGNED" };
      }
      const existingByDoc = findCustomerByDocument(docNumber) || (sale.customer.phone ? findCustomerByPhone(sale.customer.phone) : null);
      if (existingByDoc) {
        if (isLegalEntityCuit(existingByDoc.document_number)) {
          return { status: "UNASSIGNED" };
        }
        customer = existingByDoc;
      } else {
        customer = createCustomer({
          document_number: docNumber,
          name: sale.customer.name || `Comensal #${docNumber}`,
          phone: sale.customer.phone,
          loyalty_enrolled: 0,
        });
      }
    }

    if (!customer) {
      return { status: "UNASSIGNED" };
    }

    // 3. Procesar venta en motor central
    const typeLabel = sale.saleType === "TABLE" ? "Mesa" : sale.saleType === "COUNTER" ? "Mostrador" : "Delivery";
    const result = processSale({
      customerId: customer.id,
      totalAmount: sale.totalAmount,
      saleDate: sale.saleDate,
      source: "FUDO_API",
      saleType: sale.saleType,
      externalSaleId: sale.externalSaleId,
      concept: sale.concept || `Venta ${adapter.displayName} #${sale.externalSaleId} (${typeLabel})`,
    });

    if (result.success) {
      const hasPoints = (result.points_earned ?? 0) > 0;
      posEventBus.emitNotification({
        id: `sale-${sale.externalSaleId}-${Date.now()}`,
        type: "SALE_INGESTED",
        provider,
        timestamp: new Date().toISOString(),
        sale,
        pointsEarned: result.points_earned,
        totalAmount: sale.totalAmount,
        customerName: customer.name,
        message: hasPoints
          ? `¡Venta de $${sale.totalAmount.toLocaleString("es-AR")} acreditada a ${customer.name} (+${result.points_earned} pts)!`
          : `Venta de $${sale.totalAmount.toLocaleString("es-AR")} registrada para ${customer.name} (No adherido a fidelidad)`,
      });

      return {
        status: "INGESTED",
        pointsEarned: result.points_earned,
        saleId: result.sale?.id,
      };
    }

    return { status: "UNASSIGNED" };
  }

  /**
   * Sincroniza proactivamente un comensal creado en GastroBumeran hacia el sistema POS activo
   */
  public async pushCustomer(
    customer: Customer,
    provider: PosProviderType = "FUDO"
  ): Promise<{ success: boolean; externalId?: string; message?: string }> {
    const adapter = this.getAdapter(provider);
    if (!adapter.getCapabilities().supportsPushCustomer) {
      return { success: false, message: `El proveedor ${provider} no admite alta de clientes.` };
    }

    try {
      const canonicalInput: Partial<CanonicalCustomer> = {
        name: customer.name,
        documentNumber: customer.document_number,
        phone: customer.phone,
        email: customer.email,
        birthDate: customer.birth_date,
      };

      const result = await adapter.createOrUpdateCustomer(canonicalInput);
      if (result && result.externalId) {
        linkCustomerPosId(customer.id, provider, result.externalId);
        posEventBus.emitNotification({
          id: `cust-${result.externalId}-${Date.now()}`,
          type: "CUSTOMER_LINKED",
          provider,
          timestamp: new Date().toISOString(),
          customerName: customer.name,
          message: `Comensal ${customer.name} sincronizado en ${adapter.displayName} (ID: ${result.externalId}).`,
        });
        return { success: true, externalId: result.externalId };
      }
      return { success: false, message: "El POS no devolvió un ID de comensal." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`No se pudo enviar comensal a ${provider}:`, msg);
      return { success: false, message: msg };
    }
  }

  /**
   * Ingesta inmediata en tiempo real proveniente de Webhooks o del Real-Time Listener
   */
  public async processRealtimeEvent(
    event: CanonicalEvent
  ): Promise<{ success: boolean; message: string; details?: unknown }> {
    posEventBus.emitRawEvent(event);

    if (event.eventType === "PING") {
      return { success: true, message: "Ping de prueba procesado exitosamente." };
    }

    if (event.eventType === "SALE_CLOSED" && event.sale) {
      const ingestRes = await this.ingestCanonicalSale(event.sale, event.provider);
      return {
        success: ingestRes.status === "INGESTED" || ingestRes.status === "DUPLICATED",
        message:
          ingestRes.status === "INGESTED"
            ? `Venta ${event.sale.externalSaleId} acreditada exitosamente en tiempo real (+${ingestRes.pointsEarned || 0} pts).`
            : ingestRes.status === "DUPLICATED"
            ? `Venta ${event.sale.externalSaleId} ya se encontraba registrada (idempotente).`
            : `Venta ${event.sale.externalSaleId} recibida sin comensal asignado (consumidor final).`,
        details: ingestRes,
      };
    }

    if (event.eventType === "SALE_CANCELED" && event.sale) {
      const db = getDatabase();
      const existing = db
        .prepare("SELECT id, status FROM sales WHERE external_sale_id = ?")
        .get(event.sale.externalSaleId) as { id: string; status: string } | undefined;

      if (existing && existing.status !== "CANCELED") {
        cancelSale(existing.id, `Anulación en tiempo real desde ${event.provider}`);
        posEventBus.emitNotification({
          id: `rt-cancel-${event.sale.externalSaleId}-${Date.now()}`,
          type: "SALE_CANCELED",
          provider: event.provider,
          timestamp: new Date().toISOString(),
          sale: event.sale,
          message: `Venta #${event.sale.externalSaleId} cancelada en vivo desde ${event.provider}. Puntos revertidos.`,
        });
        return { success: true, message: `Venta ${event.sale.externalSaleId} cancelada en tiempo real.` };
      }
      return { success: true, message: `Venta ${event.sale.externalSaleId} no requirió anulación.` };
    }

    return { success: true, message: `Evento ${event.eventType} recibido sin acción transaccional.` };
  }
}

export const posGateway = PosGateway.getInstance();
