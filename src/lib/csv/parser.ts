import Papa from "papaparse";

export interface CsvPreviewResult {
  headers: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
  delimiter: string;
}

export interface CsvFieldMapping {
  document_number: string;
  name: string;
  total_amount: string;
  sale_date?: string;
  phone?: string;
  external_sale_id?: string;
}

export interface CsvProcessRowResult {
  rowNumber: number;
  success: boolean;
  externalSaleId?: string;
  customerName?: string;
  documentNumber?: string;
  totalAmount?: number;
  pointsEarned?: number;
  visitAdded?: boolean;
  error?: string;
}

export interface CsvBatchProcessSummary {
  totalRows: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  duplicatedCount: number;
  newCustomersCount: number;
  totalPointsEarned: number;
  totalAmountProcessed: number;
  results: CsvProcessRowResult[];
}

/**
 * Normalizes monetary amounts across Maxirest, Tango, Excel, etc.
 * Handles formats: "$ 1.500,50", "1.500,50", "1500.50", "1,500.50", "$ 15.000", etc.
 */
export function normalizeAmount(raw: unknown): number {
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  if (!raw || typeof raw !== "string") return 0;

  let str = raw.trim().replace(/[$€\s]/g, "");
  if (!str) return 0;

  // Case 1: Both period and comma present (e.g. 1.500,50 or 1,500.50)
  const lastDot = str.lastIndexOf(".");
  const lastComma = str.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // European/Latam style: 1.500,50 -> remove dots, replace comma with dot
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US style: 1,500.50 -> remove commas
      str = str.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // Only comma present: could be decimal (1500,50) or thousand separator (1,500)
    // If exactly 2 digits after comma, typically decimal: 1500,50
    const afterComma = str.substring(lastComma + 1);
    if (afterComma.length <= 2) {
      str = str.replace(",", ".");
    } else {
      str = str.replace(",", "");
    }
  } else if (lastDot !== -1) {
    // Only dot present: could be decimal (1500.50) or thousand separator (1.500)
    const afterDot = str.substring(lastDot + 1);
    if (afterDot.length === 3 && str.length > 4) {
      // Often thousand separator without decimals in Latam accounting: 15.000
      str = str.replace(/\./g, "");
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

/**
 * Cleans document / fiscal numbers (removes dots, dashes, spaces)
 */
export function normalizeDocument(raw: unknown): string {
  if (!raw) return "";
  return String(raw).trim().replace(/[\.\-\s]/g, "");
}

/**
 * Parses dates into valid ISO format, tolerating DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
 */
export function parseSaleDate(raw?: string): string {
  if (!raw || !raw.trim()) return new Date().toISOString();
  const trimmed = raw.trim();

  // Try standard parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && trimmed.includes("-") && trimmed.length >= 10) {
    return d.toISOString();
  }

  // Parse DD/MM/YYYY or DD-MM-YYYY [HH:mm[:ss]]
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const hour = match[4] ? parseInt(match[4], 10) : 12;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;

    const parsed = new Date(year, month, day, hour, min, sec);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

/**
 * Inspects CSV content, detects delimiter and returns headers and top rows preview
 */
export function inspectCsv(csvContent: string): CsvPreviewResult {
  // Auto-detect delimiter
  const firstLines = csvContent.slice(0, 4000);
  let delimiter = ",";
  const semicolonCount = (firstLines.match(/;/g) || []).length;
  const commaCount = (firstLines.match(/,/g) || []).length;
  const tabCount = (firstLines.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ";";
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = "\t";
  }

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter,
    skipEmptyLines: "greedy",
  });

  const headers = parsed.meta.fields || [];
  const previewRows = parsed.data.slice(0, 5);
  const totalRows = parsed.data.length;

  return {
    headers,
    previewRows,
    totalRows,
    delimiter,
  };
}
