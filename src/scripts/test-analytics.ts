import { getBackofficeAnalytics } from "../lib/db/analytics-repo";
import { logCronExecution, getCronLogs } from "../lib/db/cron-repo";

async function runAnalyticsTest() {
  console.log("==================================================");
  console.log("📊 INICIANDO PRUEBAS DE ANALÍTICA & CRONS (SPRINT 4)");
  console.log("==================================================");

  // 1. Test Backoffice Analytics Computation
  console.log("\n1. 📈 Calculando Métricas de Backoffice (getBackofficeAnalytics):");
  const analytics = getBackofficeAnalytics("30d");

  console.log("✓ KPIs Principales:");
  console.log(`  - Comensales Totales: ${analytics.kpis.totalCustomers}`);
  console.log(`  - Comensales Activos (90d): ${analytics.kpis.activeCustomersCount}`);
  console.log(`  - Tasa de Retención (>= 2 visitas): ${analytics.kpis.retentionRatePercent}%`);
  console.log(`  - Facturación Total Fidelizada: $${analytics.kpis.totalRevenue.toLocaleString("es-AR")}`);
  console.log(`  - Ticket Promedio: $${analytics.kpis.averageTicket.toLocaleString("es-AR")}`);
  console.log(`  - Tasa de Redención / Canje: ${analytics.kpis.pointsRedemptionRatePercent}% (${analytics.kpis.totalPointsRedeemed} pts canjeados / ${analytics.kpis.totalPointsIssued} pts emitidos)`);
  console.log(`  - Pasivo Activo en Circulación: ${analytics.kpis.currentActivePointsLiability} pts`);
  console.log(`  - Ahorro Anti-Inflación por Caducidad: ${analytics.kpis.antiInflationSavingsPoints} pts (~$${analytics.kpis.antiInflationSavingsEstimatedArs.toLocaleString("es-AR")})`);

  console.log("\n2. 🔄 Desglose por Canales de Ingesta:");
  for (const ch of analytics.ingestionChannels) {
    console.log(`  - ${ch.label} (${ch.source}): ${ch.salesCount} tickets | $${ch.totalRevenue.toLocaleString("es-AR")} (${ch.percentageRevenue}%)`);
  }

  console.log("\n3. 👥 Distribución por Cohortes de Frecuencia:");
  console.log(`  - VIP (10+ visitas): ${analytics.cohorts.vipCount}`);
  console.log(`  - Frecuentes (5-9 visitas): ${analytics.cohorts.frequentCount}`);
  console.log(`  - Ocasionales (2-4 visitas): ${analytics.cohorts.occasionalCount}`);
  console.log(`  - Nuevos (1 visita): ${analytics.cohorts.newCount}`);

  console.log("\n4. 🏆 Top 3 Comensales Más Valiosos:");
  for (let i = 0; i < Math.min(3, analytics.topCustomers.length); i++) {
    const c = analytics.topCustomers[i];
    console.log(`  #${i + 1} ${c.name} | Gasto: $${c.total_spent.toLocaleString("es-AR")} | Visitas: ${c.visit_count} | Saldo: ${c.points_balance} pts`);
  }

  console.log("\n5. ⚠️ Alertas de Prevención de Churn & Riesgo (Día 75):");
  console.log(`  - Clientes a vencer en 15 días: ${analytics.churnRisk.expiring15DaysCount} (${analytics.churnRisk.expiring15DaysPoints} pts)`);
  console.log(`  - Clientes a vencer en 30 días: ${analytics.churnRisk.expiring30DaysCount} (${analytics.churnRisk.expiring30DaysPoints} pts)`);

  // 2. Test Cron Logging
  console.log("\n6. ⏱️ Probando Bitácora de Tareas Programadas (cron_logs):");
  const testLog = logCronExecution({
    job_name: "TEST_SCHEDULED_JOB",
    status: "SUCCESS",
    summary: "Ejecución simulada exitosa de prueba unitaria",
    details: { processed: 42, errors: 0 },
    duration_ms: 25,
  });
  console.log(`✓ Registro de cron insertado con ID: ${testLog.id}`);

  const recentLogs = getCronLogs(5);
  console.log(`✓ Total de registros recuperados: ${recentLogs.length}`);
  const found = recentLogs.find((l) => l.id === testLog.id);
  if (!found) {
    throw new Error("No se encontró el registro de cron insertado en la bitácora.");
  }
  console.log(`✓ Registro verificado en DB: [${found.job_name}] ${found.status} - ${found.summary} (${found.duration_ms}ms)`);

  console.log("\n🎉 ¡TODAS LAS PRUEBAS DE ANALÍTICA Y CRONS PASARON CON ÉXITO!");
  console.log("==================================================");
}

runAnalyticsTest().catch((err) => {
  console.error("❌ Error en test de analítica:", err);
  process.exit(1);
});
