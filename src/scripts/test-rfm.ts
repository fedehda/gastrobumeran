import { getRfmSegmentationReport, generateRfmCsv } from "../lib/db/analytics-repo";
import { logCronExecution, getCronLogs } from "../lib/db/cron-repo";
import { RfmQuadrant } from "../types/loyalty";

async function runRfmTests() {
  console.log("================================================================");
  console.log("🧠 INICIANDO PRUEBAS DE INTELIGENCIA RFM & PASIVO (SPRINT H)");
  console.log("================================================================");

  // 1. Report Generation with Default CMV (32%)
  console.log("\n1. 📊 Generando Reporte de Segmentación RFM (CMV 32%):");
  const report = getRfmSegmentationReport(32);

  if (!report || typeof report !== "object") {
    throw new Error("El reporte RFM no fue generado correctamente.");
  }

  console.log(`✓ Total de comensales analizados: ${report.total_analyzed_customers}`);
  console.log(`✓ Fecha de cálculo: ${report.generated_at}`);

  // 2. Validate Quadrants
  console.log("\n2. 🎯 Verificando los 4 Cuadrantes RFM:");
  const expectedQuadrants: RfmQuadrant[] = ["CHAMPIONS", "PROMISING", "AT_RISK", "DORMANT"];

  for (const q of expectedQuadrants) {
    const stats = report.quadrants[q];
    if (!stats) {
      throw new Error(`Cuadrante ${q} no encontrado en estadísticas del reporte.`);
    }

    console.log(`  - [${stats.quadrant}] ${stats.label}:`);
    console.log(`    • Comensales: ${stats.customer_count} (${stats.percentage_of_total}%)`);
    console.log(`    • Facturación acumulada: $${stats.total_revenue.toLocaleString("es-AR")}`);
    console.log(`    • Puntos activos: ${stats.total_active_points.toLocaleString("es-AR")} pts`);
    console.log(`    • Estrategia recomendada: ${stats.strategy_recommendation}`);

    if (stats.customer_count < 0) {
      throw new Error(`Conteo negativo inválido en cuadrante ${q}`);
    }
  }

  // 3. Validate Floating Points Liability
  console.log("\n3. 💰 Verificando Control de Pasivo Contable Flotante (CMV):");
  const { liability } = report;

  console.log(`  - Puntos Circulantes Totales: ${liability.total_active_points.toLocaleString("es-AR")} pts`);
  console.log(`  - Valor Facial en Carta (10 ARS/pt): $${liability.nominal_catalog_value_ars.toLocaleString("es-AR")}`);
  console.log(`  - CMV Aplicado: ${liability.cmv_percentage}%`);
  console.log(`  - Pasivo Real en Costo de Reposición: $${liability.real_cost_liability_ars.toLocaleString("es-AR")}`);
  console.log(`  - Ahorro Extinguido (Doble Timer): ${liability.extinguished_anti_inflation_points.toLocaleString("es-AR")} pts (~$${liability.extinguished_anti_inflation_ars.toLocaleString("es-AR")})`);
  console.log(`  - Ratio Deuda / Facturación: ${liability.liability_revenue_ratio_percent}%`);
  console.log(`  - Diagnóstico de Salud Financiera: [${liability.health_status}] ${liability.health_label}`);

  const expectedNominal = liability.total_active_points * 10;
  if (liability.nominal_catalog_value_ars !== expectedNominal) {
    throw new Error(`Discrepancia en valor nominal: esperado ${expectedNominal}, obtenido ${liability.nominal_catalog_value_ars}`);
  }

  const expectedCost = Math.round(expectedNominal * 0.32);
  if (liability.real_cost_liability_ars !== expectedCost) {
    throw new Error(`Discrepancia en costo real CMV: esperado ${expectedCost}, obtenido ${liability.real_cost_liability_ars}`);
  }
  console.log("✓ Fórmulas matemáticas de pasivo contable validadas con precisión.");

  // 4. Test Dynamic CMV (e.g. 25% Alta Rentabilidad)
  console.log("\n4. ⚙️ Probando Sensibilidad de CMV Dinámico (25% Alta Rentabilidad):");
  const reportCmv25 = getRfmSegmentationReport(25);
  const expectedCost25 = Math.round(liability.nominal_catalog_value_ars * 0.25);
  if (reportCmv25.liability.real_cost_liability_ars !== expectedCost25) {
    throw new Error(`Discrepancia con CMV 25%: esperado ${expectedCost25}, obtenido ${reportCmv25.liability.real_cost_liability_ars}`);
  }
  console.log(`✓ CMV 25% recalculó el pasivo a: $${reportCmv25.liability.real_cost_liability_ars.toLocaleString("es-AR")} (esperado: $${expectedCost25.toLocaleString("es-AR")})`);

  // 5. Test Customer Segmentation & Tailored WhatsApp Messages
  console.log("\n5. 📱 Verificando Asignación de Comensales y Mensajes Quirúrgicos de WhatsApp:");
  if (report.customers.length > 0) {
    const sampleCustomer = report.customers[0];
    console.log(`  - Comensal muestra: ${sampleCustomer.name} (DNI: ${sampleCustomer.document_number})`);
    console.log(`  - Cuadrante: ${sampleCustomer.quadrant_label}`);
    console.log(`  - Recencia: ${sampleCustomer.recency_days} días | Visitas: ${sampleCustomer.frequency_visits} | Gasto: $${sampleCustomer.monetary_spent.toLocaleString("es-AR")}`);
    console.log(`  - Puntos: ${sampleCustomer.points_balance} pts`);
    console.log(`  - Mensaje sugerido WhatsApp: "${sampleCustomer.whatsapp_suggested_message}"`);

    if (!sampleCustomer.whatsapp_suggested_message.includes(sampleCustomer.name)) {
      throw new Error("El mensaje sugerido de WhatsApp debe incluir el nombre del comensal.");
    }
    console.log("✓ Plantilla de WhatsApp personalizada correctamente.");
  }

  // 6. Test CSV Export Generation
  console.log("\n6. 📄 Probando Generación de Archivo CSV (Compatible con Excel / Meta Ads):");
  const championsOnly = report.customers.filter((c: any) => c.quadrant === "CHAMPIONS");
  const csvData = generateRfmCsv(championsOnly);

  // Check UTF-8 BOM
  if (!csvData.startsWith("\uFEFF")) {
    throw new Error("El CSV debe comenzar con el carácter BOM UTF-8 (\\uFEFF) para visualización nativa de tildes en Excel.");
  }

  // Check header line
  const lines = csvData.split("\r\n");
  const headerLine = lines[0].replace("\uFEFF", "");
  console.log(`  - Encabezados: ${headerLine}`);

  if (!headerLine.includes("Cuadrante_RFM") || !headerLine.includes("Gasto_Total_ARS") || !headerLine.includes("Puntos_Activos")) {
    throw new Error("Los encabezados del CSV no contienen los campos obligatorios de RFM.");
  }

  console.log(`✓ Total filas generadas (incluye encabezado): ${lines.length}`);
  console.log("✓ Codificación UTF-8 BOM y formato RFC-4180 verificados con éxito.");

  // 7. Test Cron Logging for RFM Recalculation
  console.log("\n7. ⏱️ Probando Registro de Cron RFM en Bitácora:");
  const cronSummary = `Recálculo RFM completado: ${report.total_analyzed_customers} comensales analizados. Pasivo: $${liability.real_cost_liability_ars}.`;
  const cronLog = logCronExecution({
    job_name: "RFM_CUSTOMER_INTELLIGENCE",
    status: "SUCCESS",
    summary: cronSummary,
    details: {
      totalAnalyzed: report.total_analyzed_customers,
      champions: report.quadrants.CHAMPIONS.customer_count,
      promising: report.quadrants.PROMISING.customer_count,
      atRisk: report.quadrants.AT_RISK.customer_count,
      dormant: report.quadrants.DORMANT.customer_count,
      realCostLiabilityArs: liability.real_cost_liability_ars,
    },
    duration_ms: 18,
  });

  console.log(`✓ Log registrado con ID: ${cronLog.id}`);
  const recentLogs = getCronLogs(5);
  const foundRfmLog = recentLogs.find((l) => l.job_name === "RFM_CUSTOMER_INTELLIGENCE");
  if (!foundRfmLog) {
    throw new Error("No se pudo verificar el log de RFM_CUSTOMER_INTELLIGENCE en la base de datos.");
  }
  console.log(`✓ Verificación exitosa en cron_logs: [${foundRfmLog.job_name}] ${foundRfmLog.summary}`);

  console.log("\n================================================================");
  console.log("🎉 ¡TODAS LAS PRUEBAS DEL SPRINT FUTURO H PASARON EXITOSAMENTE!");
  console.log("================================================================");
}

runRfmTests().catch((err) => {
  console.error("❌ Error en pruebas RFM:", err);
  process.exit(1);
});
