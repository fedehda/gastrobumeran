import { getDatabase } from "@/lib/db/db";
import { getFudoConfig, updateFudoLastSync } from "@/lib/db/fudo-repo";
import {
  findCustomerByFudoId,
  findCustomerByDocument,
  findCustomerByPhone,
  createCustomer,
  linkFudoCustomerId,
} from "@/lib/db/customer-repo";
import { processSale } from "@/lib/loyalty/engine";
import { FudoApiClient } from "./client";
import { FudoSyncResult, Customer } from "@/types/loyalty";

export interface SyncOptions {
  fullSync?: boolean;
  syncCustomers?: boolean;
}

export interface CustomerSyncResult {
  totalFudoCustomers: number;
  importedCount: number;
  updatedCount: number;
}

/**
 * Synchronizes the entire active customer directory from Fudo POS into GastroBumeran
 */
export async function syncFudoCustomers(clientInstance?: FudoApiClient): Promise<CustomerSyncResult> {
  const config = getFudoConfig();
  const client = clientInstance || new FudoApiClient(config);

  let fudoCustomers = [];
  try {
    fudoCustomers = await client.getCustomers({ activeOnly: true });
  } catch (error) {
    console.warn("No se pudo obtener el directorio completo de clientes de Fudo:", error);
    return { totalFudoCustomers: 0, importedCount: 0, updatedCount: 0 };
  }

  let importedCount = 0;
  let updatedCount = 0;

  for (const fc of fudoCustomers) {
    try {
      const doc = fc.fiscalNumber ? fc.fiscalNumber.trim() : null;
      let existing: Customer | null = findCustomerByFudoId(fc.id);

      if (!existing && doc) {
        existing = findCustomerByDocument(doc);
      }

      if (!existing && fc.phone) {
        existing = findCustomerByPhone(fc.phone);
      }

      if (existing) {
        if (!existing.fudo_customer_id || existing.fudo_customer_id !== fc.id) {
          linkFudoCustomerId(existing.id, fc.id);
        }
        updatedCount++;
      } else {
        createCustomer({
          fudo_customer_id: fc.id,
          document_number: doc || fc.id,
          name: fc.name || `Cliente Fudo #${fc.id}`,
          phone: fc.phone,
          email: fc.email,
          birth_date: fc.birthDate,
        });
        importedCount++;
      }
    } catch (e) {
      console.warn(`Error al importar cliente Fudo ${fc.id}:`, e);
    }
  }

  return {
    totalFudoCustomers: fudoCustomers.length,
    importedCount,
    updatedCount,
  };
}

export async function syncFudoSales(options?: SyncOptions): Promise<FudoSyncResult> {
  const db = getDatabase();
  const config = getFudoConfig();
  const client = new FudoApiClient(config);

  const fromIso = options?.fullSync ? undefined : config.last_sync_at || undefined;
  const syncStartTime = new Date().toISOString();

  const errors: string[] = [];
  let syncedCount = 0;
  let duplicatedCount = 0;
  let unassignedCount = 0;
  let newCustomersCount = 0;
  let totalPointsEarned = 0;
  let totalAmountProcessed = 0;

  // 1. Optionally sync customer directory so sales can immediately link to registered profiles
  let importedCustomersCount = 0;
  let updatedCustomersCount = 0;
  if (options?.syncCustomers !== false) {
    try {
      const custSync = await syncFudoCustomers(client);
      importedCustomersCount = custSync.importedCount;
      updatedCustomersCount = custSync.updatedCount;
    } catch (custErr) {
      const msg = custErr instanceof Error ? custErr.message : String(custErr);
      errors.push(`Aviso al sincronizar clientes: ${msg}`);
    }
  }

  // 2. Retrieve closed sales from Fudo
  let fudoSales = [];
  try {
    fudoSales = await client.getClosedSales(fromIso);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(`Error al conectar con Fudo: ${msg}`);
    return {
      totalRetrieved: 0,
      syncedCount: 0,
      duplicatedCount: 0,
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

  // 3. Process each sale
  for (const sale of fudoSales) {
    try {
      // 1. Check idempotency on external_sale_id
      const existing = db.prepare("SELECT id FROM sales WHERE external_sale_id = ?").get(sale.id);
      if (existing) {
        duplicatedCount++;
        continue;
      }

      // 2. Resolve customer by Fudo ID, Document/VAT, or Phone
      let customer: Customer | null = null;

      if (sale.customerId) {
        customer = findCustomerByFudoId(sale.customerId);
      }

      if (!customer && sale.customerDocument) {
        customer = findCustomerByDocument(sale.customerDocument);
        if (customer && sale.customerId) {
          linkFudoCustomerId(customer.id, sale.customerId);
        }
      }

      if (!customer && sale.customerPhone) {
        customer = findCustomerByPhone(sale.customerPhone);
        if (customer && sale.customerId) {
          linkFudoCustomerId(customer.id, sale.customerId);
        }
      }

      // 3. If still not found and customerId is present, fetch customer details from Fudo
      if (!customer && sale.customerId) {
        try {
          const fudoCust = await client.getCustomer(sale.customerId);
          if (fudoCust) {
            const docNumber = (fudoCust.fiscalNumber || fudoCust.id).trim();
            const existingByDoc = findCustomerByDocument(docNumber);
            if (existingByDoc) {
              linkFudoCustomerId(existingByDoc.id, fudoCust.id);
              customer = existingByDoc;
            } else {
              customer = createCustomer({
                fudo_customer_id: fudoCust.id,
                document_number: docNumber,
                name: fudoCust.name || `Cliente Fudo #${fudoCust.id}`,
                phone: fudoCust.phone || sale.customerPhone,
                email: fudoCust.email,
                birth_date: fudoCust.birthDate,
              });
              newCustomersCount++;
            }
          }
        } catch (fetchCustErr) {
          console.warn(`No se pudo obtener detalle del cliente ${sale.customerId}:`, fetchCustErr);
        }
      }

      // 4. If sale has no registered customer in Fudo, check if we can create one from delivery/anonymous info
      if (!customer && (sale.customerDocument || (sale.customerPhone && sale.customerName))) {
        const docNumber = sale.customerDocument || sale.customerPhone!;
        const existingByDoc = findCustomerByDocument(docNumber) || (sale.customerPhone ? findCustomerByPhone(sale.customerPhone) : null);
        if (existingByDoc) {
          customer = existingByDoc;
        } else {
          customer = createCustomer({
            document_number: docNumber,
            name: sale.customerName || `Cliente #${docNumber}`,
            phone: sale.customerPhone,
          });
          newCustomersCount++;
        }
      }

      // 5. If no customer could be identified at all, count as unassigned sale
      if (!customer) {
        unassignedCount++;
        continue;
      }

      // 6. Ingest sale into loyalty engine
      const typeLabel = sale.type === "TABLE" ? "Mesa" : sale.type === "COUNTER" ? "Mostrador" : "Delivery";
      const result = processSale({
        customerId: customer.id,
        totalAmount: sale.total,
        saleDate: sale.createdAt,
        source: "FUDO_API",
        saleType: sale.type,
        externalSaleId: sale.id,
        concept: `Venta Fudo #${sale.id} (${typeLabel})`,
      });

      if (result.success) {
        syncedCount++;
        totalPointsEarned += result.points_earned;
        totalAmountProcessed += sale.total;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error en venta ${sale.id}: ${msg}`);
    }
  }

  // 4. Add informative notice if there were unassigned sales
  if (unassignedCount > 0) {
    errors.push(
      `Información: ${unassignedCount} venta(s) cerrada(s) no tenían comensal asociado en Fudo (se omitieron para no emitir puntos a consumidor final anónimo).`
    );
  }

  // 5. Record successful sync time
  updateFudoLastSync(syncStartTime);

  return {
    totalRetrieved: fudoSales.length,
    syncedCount,
    duplicatedCount,
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
