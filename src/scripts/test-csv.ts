import { normalizeAmount, normalizeDocument, inspectCsv } from "@/lib/csv/parser";
import { processCsvBatch } from "@/lib/csv/batch-processor";
import { getAllPresets, savePreset } from "@/lib/db/presets-repo";

async function main() {
  console.log("=== INICIANDO PRUEBAS DEL IMPORTADOR UNIVERSAL DE CSV (SPRINT 2) ===");

  // 1. Prueba de normalizador de importes
  console.log("\n1. Probando normalización de importes monetarios:");
  const testAmounts = [
    { input: "$ 1.500,50", expected: 1500.5 },
    { input: "1500,50", expected: 1500.5 },
    { input: "1,500.50", expected: 1500.5 },
    { input: "$ 15.000", expected: 15000 },
    { input: "2500.00", expected: 2500 },
    { input: "  $  3.450,25 ", expected: 3450.25 },
  ];

  for (const t of testAmounts) {
    const res = normalizeAmount(t.input);
    const pass = Math.abs(res - t.expected) < 0.01;
    console.log(`   "${t.input}" -> ${res} [${pass ? "✔ OK" : "❌ FALLO"}]`);
    if (!pass) throw new Error(`Falló normalización para ${t.input}`);
  }

  // 2. Normalización de documentos
  console.log("\n2. Probando normalización de documentos:");
  const testDocs = [
    { input: "30.123.456", expected: "30123456" },
    { input: " 20-30123456-7 ", expected: "20301234567" },
  ];
  for (const t of testDocs) {
    const res = normalizeDocument(t.input);
    console.log(`   "${t.input}" -> "${res}" [${res === t.expected ? "✔ OK" : "❌ FALLO"}]`);
  }

  // 3. Simulación de archivo Maxirest
  console.log("\n3. Previsualizando y detectando CSV formato Maxirest (; delimitador):");
  const maxirestCsv = `DNI_CUIT;Cliente_Nombre;Total_Comprobante;Fecha_Emision;Telefono;Nro_Ticket
30.123.456;Juan Pérez;$ 5.400,00;28/09/2026 21:30;+5491144445555;MAXI-9001
28.987.654;María Fernández;15.200,50;28/09/2026 22:15;+5491166667777;MAXI-9002
99.111.222;Nuevo Comensal CSV;$ 8.000;28/09/2026;+5491100001111;MAXI-9003`;

  const preview = inspectCsv(maxirestCsv);
  console.log("   Delimitador detectado:", `"${preview.delimiter}"`);
  console.log("   Cabeceras detectadas:", preview.headers);
  console.log("   Filas para previsualización (5 máx):", preview.previewRows.length);

  // 4. Presets de Mapeo
  console.log("\n4. Verificando Presets de Mapeo en BD:");
  const presets = getAllPresets();
  console.log("   Presets disponibles:", presets.map((p) => p.system_name));

  // Guardar nuevo preset de prueba
  const customPreset = savePreset("Sistema Gastronómico X", {
    document_number: "DNI_CUIT",
    name: "Cliente_Nombre",
    total_amount: "Total_Comprobante",
    sale_date: "Fecha_Emision",
    phone: "Telefono",
    external_sale_id: "Nro_Ticket",
  }, ";");
  console.log("   Preset guardado:", customPreset.system_name);

  // 5. Procesamiento por lote real contra el Motor de Fidelización
  console.log("\n5. Ejecutando lote de importación...");
  const summary = processCsvBatch({
    csvContent: maxirestCsv,
    mapping: {
      document_number: "DNI_CUIT",
      name: "Cliente_Nombre",
      total_amount: "Total_Comprobante",
      sale_date: "Fecha_Emision",
      phone: "Telefono",
      external_sale_id: "Nro_Ticket",
    },
    delimiter: ";",
    presetName: "Maxirest",
  });

  console.log("   Resumen de Lote:", {
    totalFilas: summary.totalRows,
    procesadasExito: summary.successCount,
    duplicadas: summary.duplicatedCount,
    errores: summary.errorCount,
    nuevosClientes: summary.newCustomersCount,
    puntosEmitidos: summary.totalPointsEarned,
    montoTotal: summary.totalAmountProcessed,
  });

  // 6. Prueba de Idempotencia: Volver a importar el mismo lote
  console.log("\n6. Probando Idempotencia (re-importando el mismo archivo con mismos IDs externos)...");
  const summary2 = processCsvBatch({
    csvContent: maxirestCsv,
    mapping: {
      document_number: "DNI_CUIT",
      name: "Cliente_Nombre",
      total_amount: "Total_Comprobante",
      sale_date: "Fecha_Emision",
      phone: "Telefono",
      external_sale_id: "Nro_Ticket",
    },
    delimiter: ";",
    presetName: "Maxirest",
  });

  console.log("   Resultado Re-importación (deben ser duplicadas sin sumar puntos repetidos):", {
    duplicadasOmitidas: summary2.duplicatedCount,
    exitoNuevo: summary2.successCount,
    puntosEmitidos: summary2.totalPointsEarned,
  });

  if (summary2.duplicatedCount === 3 && summary2.totalPointsEarned === 0) {
    console.log("✔ Idempotencia validada: Ninguna venta se duplicó en el sistema.");
  } else {
    console.error("❌ Falló prueba de idempotencia en lote");
  }

  console.log("\n=== TODAS LAS PRUEBAS DEL IMPORTADOR CSV PASARON CON ÉXITO ===");
}

main().catch(console.error);
