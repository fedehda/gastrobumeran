import Papa from "papaparse";
import { normalizeAmount, normalizeDocument, parseSaleDate, CsvFieldMapping, CsvBatchProcessSummary, CsvProcessRowResult } from "./parser";
import { processSale } from "@/lib/loyalty/engine";
import { findCustomerByDocument } from "@/lib/db/customer-repo";
import { isLegalEntityCuit } from "@/lib/validation/cuit";
import crypto from "crypto";

export interface ProcessCsvBatchOptions {
  csvContent: string;
  mapping: CsvFieldMapping;
  delimiter?: string;
  presetName?: string;
}

export function processCsvBatch({
  csvContent,
  mapping,
  delimiter,
  presetName,
}: ProcessCsvBatchOptions): CsvBatchProcessSummary {
  // Parse full CSV
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: delimiter || undefined,
    skipEmptyLines: "greedy",
  });

  const rows = parsed.data;
  const batchId = crypto.randomUUID();

  let successCount = 0;
  let errorCount = 0;
  let duplicatedCount = 0;
  let newCustomersCount = 0;
  let skippedCompaniesCount = 0;
  let totalPointsEarned = 0;
  let totalAmountProcessed = 0;

  const results: CsvProcessRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    const rawDoc = mapping.document_number ? row[mapping.document_number] : "";
    const rawName = mapping.name ? row[mapping.name] : "";
    const rawAmount = mapping.total_amount ? row[mapping.total_amount] : "";
    const rawDate = mapping.sale_date ? row[mapping.sale_date] : "";
    const rawPhone = mapping.phone ? row[mapping.phone] : undefined;
    const rawExternalId = mapping.external_sale_id ? row[mapping.external_sale_id] : undefined;

    const doc = normalizeDocument(rawDoc);
    const name = (rawName || "").trim();
    const amount = normalizeAmount(rawAmount);
    const dateStr = parseSaleDate(rawDate);
    const phone = rawPhone ? rawPhone.trim() : undefined;
    const externalSaleId = rawExternalId ? rawExternalId.trim() : undefined;

    // Row Validations
    if (!doc) {
      errorCount++;
      results.push({
        rowNumber,
        success: false,
        error: "Columna de DNI/Identificador vacía o inválida",
      });
      continue;
    }

    if (isLegalEntityCuit(doc)) {
      skippedCompaniesCount++;
      results.push({
        rowNumber,
        success: false,
        externalSaleId,
        customerName: name || `Empresa CUIT ${doc}`,
        documentNumber: doc,
        totalAmount: amount,
        error: "Omitido: CUIT de Persona Jurídica (Empresa). El programa de fidelización es exclusivo para personas humanas.",
      });
      continue;
    }

    if (amount <= 0) {
      errorCount++;
      results.push({
        rowNumber,
        success: false,
        documentNumber: doc,
        customerName: name,
        error: `Importe inválido ($${rawAmount})`,
      });
      continue;
    }

    const effectiveName = name || `Cliente DNI ${doc}`;

    // Check if customer is new before processing
    const existingCust = findCustomerByDocument(doc);
    if (!existingCust) {
      newCustomersCount++;
    }

    try {
      const conceptText = `Importación CSV [${presetName || "Universal"}] - Ticket $${amount.toLocaleString("es-AR")}`;

      const saleResult = processSale({
        documentNumber: doc,
        customerName: effectiveName,
        customerPhone: phone,
        totalAmount: amount,
        saleDate: dateStr,
        source: "CSV_IMPORT",
        externalSaleId,
        concept: conceptText,
        importBatchId: batchId,
      });

      if (saleResult.message?.includes("Idempotencia")) {
        duplicatedCount++;
      } else {
        successCount++;
        totalPointsEarned += saleResult.points_earned;
        totalAmountProcessed += amount;
      }

      results.push({
        rowNumber,
        success: true,
        externalSaleId,
        customerName: effectiveName,
        documentNumber: doc,
        totalAmount: amount,
        pointsEarned: saleResult.points_earned,
        visitAdded: saleResult.visit_added,
      });
    } catch (err: unknown) {
      errorCount++;
      const errMsg = err instanceof Error ? err.message : "Error desconocido al procesar fila";
      results.push({
        rowNumber,
        success: false,
        externalSaleId,
        customerName: effectiveName,
        documentNumber: doc,
        totalAmount: amount,
        error: errMsg,
      });
    }
  }

  return {
    totalRows: rows.length,
    processedCount: rows.length,
    successCount,
    errorCount,
    duplicatedCount,
    newCustomersCount,
    skippedCompaniesCount,
    totalPointsEarned,
    totalAmountProcessed,
    results,
  };
}
