import {
  normalizeDocumentDigits,
  isLegalEntityCuit,
  validateHumanDocument,
} from "../lib/validation/cuit";
import { createCustomer, findCustomerByDocument } from "../lib/db/customer-repo";
import { PosGateway } from "../lib/pos/core/pos-gateway";
import { processCsvBatch } from "../lib/csv/batch-processor";
import { getDatabase } from "../lib/db/db";

async function runCuitExclusionTestSuite() {
  console.log("==================================================================");
  console.log("🧪 TEST SUITE: EXCLUSIÓN DE PERSONAS JURÍDICAS / CUITS DE EMPRESA");
  console.log("==================================================================\n");

  const db = getDatabase();

  // ------------------------------------------------------------------
  // 1. UNIT TESTS: Validación de Algoritmo Fiscal AFIP/ARCA
  // ------------------------------------------------------------------
  console.log("1. Validando funciones de detección fiscal en cuit.ts...");

  if (normalizeDocumentDigits("30-70809010-4") !== "30708090104" || normalizeDocumentDigits("30.123.456") !== "30123456") {
    throw new Error("❌ Falló normalizeDocumentDigits");
  }
  console.log("  ✓ normalizeDocumentDigits limpia caracteres no numéricos correctamente.");

  // A. Casos de Personas Jurídicas (Empresas) -> DEBEN SER DETECTADAS COMO TRUE
  const corporateCases = [
    "30-70809010-4",
    "30708090104",
    "33-71234567-9",
    "34-89012345-2",
    "50-12345678-0",
    "51-12345678-1",
    "55-12345678-5",
    "30.708.090.104",
  ];

  for (const c of corporateCases) {
    if (!isLegalEntityCuit(c)) {
      throw new Error(`❌ Falló: '${c}' debió ser detectado como CUIT corporativo`);
    }
    const valResult = validateHumanDocument(c);
    if (valResult.valid) {
      throw new Error(`❌ Falló: validateHumanDocument('${c}') debió retornar inválido`);
    }
  }
  console.log(`  ✓ ${corporateCases.length} formatos de CUIT corporativo detectados correctamente.`);

  // B. Casos de Personas Humanas (DNI 6 a 8 dígitos o CUIL personal) -> DEBEN SER FALSE (VÁLIDOS)
  const humanCases = [
    "30.123.456",     // 8 dígitos empezando con 30 (DNI de una persona!)
    "30123456",       // 8 dígitos
    "33.777.888",     // 8 dígitos empezando con 33 (DNI de una persona!)
    "8.765.432",      // 7 dígitos
    "40123456",       // 8 dígitos
    "20-30123456-7",   // CUIL masculino
    "27-30123456-4",   // CUIL femenino
    "23-30123456-9",   // CUIL alternativo
    "24-30123456-1",   // CUIL alternativo
    "20301234567",    // CUIL sin guiones
  ];

  for (const h of humanCases) {
    if (isLegalEntityCuit(h)) {
      throw new Error(`❌ Falló falso positivo: '${h}' fue erróneamente clasificado como empresa`);
    }
    const valResult = validateHumanDocument(h);
    if (!valResult.valid) {
      throw new Error(`❌ Falló: validateHumanDocument('${h}') debió ser válido: ${valResult.errorMessage}`);
    }
  }
  console.log(`  ✓ ${humanCases.length} formatos de Personas Humanas (incluyendo DNI 30.xxx.xxx y CUIL) aprobados sin falsos positivos.`);

  // ------------------------------------------------------------------
  // 2. REPO TESTS: createCustomer debe bloquear CUITs de empresas
  // ------------------------------------------------------------------
  console.log("\n2. Probando protección en createCustomer (customer-repo)...");

  const testCorpCuit = "30-99887766-5";
  const testHumanDni = "30887766"; // 8 dígitos

  // Cleanup pre-existing
  const existingCorp = findCustomerByDocument(testCorpCuit);
  if (existingCorp) db.prepare("DELETE FROM customers WHERE id = ?").run(existingCorp.id);
  const existingHuman = findCustomerByDocument(testHumanDni);
  if (existingHuman) db.prepare("DELETE FROM customers WHERE id = ?").run(existingHuman.id);

  let blockedAsExpected = false;
  try {
    createCustomer({
      document_number: testCorpCuit,
      name: "Empresa Invalida S.A.",
    });
  } catch (err: unknown) {
    blockedAsExpected = true;
    console.log(`  ✓ Intento de registrar CUIT corporativo bloqueado con mensaje: "${(err as Error).message}"`);
  }

  if (!blockedAsExpected) {
    throw new Error("❌ createCustomer debió arrojar error al intentar registrar CUIT corporativo.");
  }

  // Verificar que una persona humana con DNI de 8 dígitos empezando con 30 sí puede crearse
  const createdHuman = createCustomer({
    document_number: testHumanDni,
    name: "Persona Humana DNI Treinta Millones",
  });
  if (!createdHuman || createdHuman.document_number !== testHumanDni) {
    throw new Error("❌ Falló la creación de cliente humano con DNI de 8 dígitos.");
  }
  console.log(`  ✓ Cliente persona humana #${createdHuman.id} (DNI ${testHumanDni}) creado exitosamente.`);
  // Cleanup test human
  db.prepare("DELETE FROM customers WHERE id = ?").run(createdHuman.id);

  // ------------------------------------------------------------------
  // 3. POS GATEWAY TESTS: ingestCanonicalSale con comensal corporativo
  // ------------------------------------------------------------------
  console.log("\n3. Probando exclusión en PosGateway.ingestCanonicalSale...");

  const posGateway = PosGateway.getInstance();
  const corpSaleResult = await posGateway.ingestCanonicalSale(
    {
      externalSaleId: `TEST-CORP-SALE-${Date.now()}`,
      provider: "FUDO",
      status: "CLOSED",
      saleType: "TABLE",
      totalAmount: 45000,
      saleDate: new Date().toISOString(),
      customer: {
        documentNumber: "30-71998877-3", // Factura A a empresa
        name: "Constructora del Sur S.R.L.",
      },
    },
    "FUDO"
  );

  if (corpSaleResult.status !== "UNASSIGNED") {
    throw new Error(`❌ Esperado status 'UNASSIGNED' para venta corporativa, obtenido: ${corpSaleResult.status}`);
  }
  console.log("  ✓ Venta con CUIT de empresa tratada como 'UNASSIGNED' (no acumula puntos ni crea cliente en fidelidad).");

  // ------------------------------------------------------------------
  // 4. CSV IMPORT TESTS: Lote mixto de humanos y personas jurídicas
  // ------------------------------------------------------------------
  console.log("\n4. Probando importación de lote CSV con filtro de empresas...");

  const testCsvContent = `DNI_CUIT;Cliente_Nombre;Total_Comprobante;Fecha_Emision;Telefono;Nro_Ticket
30.123.456;Juan Pérez (DNI 30M);5400;2026-10-06 21:00;+5491144445555;TEST-CSV-01
30-70809010-4;Distribuidora Alimentos S.A.;85000;2026-10-06 21:15;+5491166667777;TEST-CSV-02
20-30123456-7;Carlos González (CUIL);12500;2026-10-06 22:00;+5491133334444;TEST-CSV-03
33-71234567-9;Estudio Juridico y Contable;42000;2026-10-06 22:30;+5491155556666;TEST-CSV-04`;

  const summary = processCsvBatch({
    csvContent: testCsvContent,
    delimiter: ";",
    mapping: {
      document_number: "DNI_CUIT",
      name: "Cliente_Nombre",
      total_amount: "Total_Comprobante",
      sale_date: "Fecha_Emision",
      phone: "Telefono",
      external_sale_id: "Nro_Ticket",
    },
    presetName: "Test Exclusión Empresas",
  });

  console.log("  Resumen de procesamiento CSV:", {
    totalRows: summary.totalRows,
    successCount: summary.successCount,
    skippedCompaniesCount: summary.skippedCompaniesCount,
    errorCount: summary.errorCount,
  });

  if (summary.totalRows !== 4) {
    throw new Error(`❌ Total de filas esperado 4, obtenido ${summary.totalRows}`);
  }
  if (summary.successCount !== 2) {
    throw new Error(`❌ Ventas exitosas esperadas 2 (humanos), obtenido ${summary.successCount}`);
  }
  if (summary.skippedCompaniesCount !== 2) {
    throw new Error(`❌ Empresas excluidas esperadas 2, obtenido ${summary.skippedCompaniesCount}`);
  }

  // Cleanup test CSV sales and customers
  for (const doc of ["30123456", "20301234567"]) {
    const c = findCustomerByDocument(doc);
    if (c) {
      db.prepare("DELETE FROM points_batches WHERE customer_id = ?").run(c.id);
      db.prepare("DELETE FROM points_history WHERE customer_id = ?").run(c.id);
      db.prepare("DELETE FROM sales WHERE customer_id = ?").run(c.id);
      db.prepare("DELETE FROM customers WHERE id = ?").run(c.id);
    }
  }

  console.log("  ✓ Lote CSV procesó exclusivamente personas humanas y omitió CUITs de empresas.");
  console.log("\n==================================================================");
  console.log("🎉 TODOS LOS TESTS DE EXCLUSIÓN DE PERSONAS JURÍDICAS PASARON!");
  console.log("==================================================================");
}

runCuitExclusionTestSuite().catch((err) => {
  console.error("❌ ERROR EN TEST SUITE:", err);
  process.exit(1);
});
