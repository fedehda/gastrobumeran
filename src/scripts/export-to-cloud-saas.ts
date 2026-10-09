/**
 * GastroBumeran - Script de Exportación y Preparación de Migración a Cloud-SaaS
 * 
 * Este script extrae toda la base de datos SQLite local (Restaurante, Configuración, Premios,
 * Campañas, Clientes, Ventas, Lotes FIFO e Historial) estructurada y lista para ser importada
 * en la plataforma multi-tenant Cloud-SaaS de GastroBumeran.
 * 
 * Uso:
 *   npx tsx src/scripts/export-to-cloud-saas.ts
 */

import fs from "fs";
import path from "path";
import { exportLocalDataForCloudSaas, getMigrationDiagnostics } from "../lib/db/restaurant-repo";

async function main() {
  console.log("===================================================================");
  console.log("   GastroBumeran - Exportador de Base de Datos para Cloud-SaaS     ");
  console.log("===================================================================\n");

  console.log("1. Ejecutando diagnóstico de compatibilidad de la base SQLite local...");
  const diagnostics = getMigrationDiagnostics();
  console.log("   • Restaurante Local:", diagnostics.restaurant.name, `(slug: "${diagnostics.restaurant.slug}")`);
  console.log("   • ID Asignado:", diagnostics.restaurant.id);
  console.log("   • Clientes en base:", diagnostics.counts.customers);
  console.log("   • Ventas registradas:", diagnostics.counts.sales);
  console.log("   • Lotes FIFO activos:", diagnostics.counts.batches);
  console.log("   • Puntos activos circulantes:", diagnostics.counts.total_active_points);
  console.log("   • Estado de particionamiento:", diagnostics.is_ready_for_cloud ? "✔ 100% COMPATIBLE" : "⚠ Requiere revisión");

  console.log("\n2. Consolidando paquete de migración estructurado...");
  const bundle = exportLocalDataForCloudSaas();

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `gastrobumeran-cloud-export-${bundle.restaurant.slug}-${timestamp}.json`;
  const exportPath = path.join(dataDir, filename);

  fs.writeFileSync(exportPath, JSON.stringify(bundle, null, 2), "utf-8");

  console.log("\n✔ EXPORTACIÓN COMPLETADA EXITOSAMENTE!");
  console.log("   • Archivo generado:", exportPath);
  console.log("   • Tamaño:", (fs.statSync(exportPath).size / 1024).toFixed(2), "KB");
  console.log("   • Total registros exportados:", {
    clientes: bundle.stats.total_customers,
    ventas: bundle.stats.total_sales,
    lotes_fifo: bundle.stats.total_batches,
    auditoria_puntos: bundle.stats.total_history_entries,
    recompensas: bundle.loyalty_rewards.length,
    campanas: bundle.loyalty_campaigns.length,
  });

  console.log("\nEste archivo puede ser importado directamente en el panel Cloud-SaaS o restaurado");
  console.log("en cualquier instancia de GastroBumeran conservando la totalidad de los datos.\n");
}

main().catch((err) => {
  console.error("Error durante la exportación:", err);
  process.exit(1);
});
