import { getDatabase } from "@/lib/db/db";
import { getFudoConfig, updateFudoLastSync } from "@/lib/db/fudo-repo";
import { findCustomerByFudoId, findCustomerByDocument, createCustomer, linkFudoCustomerId } from "@/lib/db/customer-repo";
import { processSale } from "@/lib/loyalty/engine";
import { FudoApiClient } from "./client";
import { FudoSyncResult, Customer } from "@/types/loyalty";

export interface SyncOptions {
  fullSync?: boolean;
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
  let newCustomersCount = 0;
  let totalPointsEarned = 0;
  let totalAmountProcessed = 0;

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
      newCustomersCount: 0,
      totalPointsEarned: 0,
      totalAmountProcessed: 0,
      errors,
      lastSyncAt: config.last_sync_at || syncStartTime,
    };
  }

  for (const sale of fudoSales) {
    try {
      // 1. Check idempotency on external_sale_id
      const existing = db.prepare("SELECT id FROM sales WHERE external_sale_id = ?").get(sale.id);
      if (existing) {
        duplicatedCount++;
        continue;
      }

      // 2. Identify or skip if unassigned customer
      if (!sale.customerId) {
        // Sales without customer cannot accrue points
        continue;
      }

      // 3. Resolve customer
      let customer: Customer | null = findCustomerByFudoId(sale.customerId);

      if (!customer) {
        // Fetch from Fudo customer endpoint
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
              phone: fudoCust.phone,
              email: fudoCust.email,
            });
            newCustomersCount++;
          }
        }
      }

      if (!customer) {
        errors.push(`Venta ${sale.id}: No se pudo resolver ni crear el cliente Fudo ${sale.customerId}`);
        continue;
      }

      // 4. Ingest sale into loyalty engine
      const typeLabel = sale.type === "TABLE" ? "Mesa" : sale.type === "COUNTER" ? "Mostrador" : "Delivery";
      const result = processSale({
        customerId: customer.id,
        totalAmount: sale.total,
        saleDate: sale.createdAt,
        source: "FUDO_API",
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

  // Record successful sync time
  updateFudoLastSync(syncStartTime);

  return {
    totalRetrieved: fudoSales.length,
    syncedCount,
    duplicatedCount,
    newCustomersCount,
    totalPointsEarned,
    totalAmountProcessed,
    errors,
    lastSyncAt: syncStartTime,
  };
}
