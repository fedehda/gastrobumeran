import { getDatabase } from "./db";
import { getFudoConfig } from "./fudo-repo";

export interface TestDataCounts {
  customers: number;
  sales: number;
  pointsBatches: number;
  activePoints: number;
  pointsHistory: number;
  cronLogs: number;
  preservedData: {
    adminUsers: number;
    rewards: number;
    csvPresets: number;
    hasLoyaltySettings: boolean;
  };
  fudoStatus: {
    isSandbox: boolean;
    hasApiKey: boolean;
    maskedApiKey: string;
    lastSyncAt: string | null;
  };
}

export interface ResetTestDataResult {
  success: boolean;
  deleted: {
    customers: number;
    sales: number;
    pointsBatches: number;
    pointsHistory: number;
    cronLogs: number;
  };
  preserved: {
    adminUsers: number;
    rewards: number;
    csvPresets: number;
  };
  fudoSyncReset: boolean;
  executedAt: string;
}

/**
 * Obtiene las métricas en tiempo real de registros transaccionales de prueba
 * y confirma la integridad de las tablas base que se preservan.
 */
export function getTestDataCounts(): TestDataCounts {
  const db = getDatabase();

  const customersCount = (db.prepare("SELECT COUNT(*) as count FROM customers").get() as { count: number }).count;
  const salesCount = (db.prepare("SELECT COUNT(*) as count FROM sales").get() as { count: number }).count;
  const batchesCount = (db.prepare("SELECT COUNT(*) as count FROM points_batches").get() as { count: number }).count;
  const historyCount = (db.prepare("SELECT COUNT(*) as count FROM points_history").get() as { count: number }).count;
  const cronLogsCount = (db.prepare("SELECT COUNT(*) as count FROM cron_logs").get() as { count: number }).count;

  const pointsRow = db.prepare("SELECT COALESCE(SUM(points_balance), 0) as total FROM customers").get() as { total: number };
  const activePoints = pointsRow.total || 0;

  const adminUsersCount = (db.prepare("SELECT COUNT(*) as count FROM admin_users").get() as { count: number }).count;
  const rewardsCount = (db.prepare("SELECT COUNT(*) as count FROM loyalty_rewards").get() as { count: number }).count;
  const csvPresetsCount = (db.prepare("SELECT COUNT(*) as count FROM csv_mapping_presets").get() as { count: number }).count;
  const settingsCount = (db.prepare("SELECT COUNT(*) as count FROM loyalty_settings").get() as { count: number }).count;

  const fudoConfig = getFudoConfig();
  const rawKey = (fudoConfig.api_key || "").trim();
  const isSandbox =
    !rawKey ||
    rawKey.startsWith("DEMO_") ||
    rawKey.toUpperCase() === "SANDBOX" ||
    (fudoConfig.api_secret || "").trim().startsWith("DEMO_");

  const maskedApiKey = rawKey.length > 8
    ? `${rawKey.substring(0, 4)}...${rawKey.substring(rawKey.length - 4)}`
    : rawKey.length > 0
    ? `${rawKey.substring(0, 2)}****`
    : "(Sin configurar)";

  return {
    customers: customersCount,
    sales: salesCount,
    pointsBatches: batchesCount,
    activePoints,
    pointsHistory: historyCount,
    cronLogs: cronLogsCount,
    preservedData: {
      adminUsers: adminUsersCount,
      rewards: rewardsCount,
      csvPresets: csvPresetsCount,
      hasLoyaltySettings: settingsCount > 0,
    },
    fudoStatus: {
      isSandbox,
      hasApiKey: rawKey.length > 0,
      maskedApiKey,
      lastSyncAt: fudoConfig.last_sync_at || null,
    },
  };
}

/**
 * Purga de forma atómica todos los datos de prueba transaccionales
 * PRESERVANDO intactos: admin_users, loyalty_settings, loyalty_rewards y csv_mapping_presets.
 */
export function resetTestData(options?: {
  resetFudoSync?: boolean;
  resetCronLogs?: boolean;
}): ResetTestDataResult {
  const db = getDatabase();
  const resetFudo = options?.resetFudoSync ?? true;
  const resetCrons = options?.resetCronLogs ?? true;

  // Medir conteos previos para reporte
  const beforeCounts = getTestDataCounts();

  // Ejecución en bloque atómico
  db.exec("BEGIN TRANSACTION;");
  try {
    db.exec("DELETE FROM points_history;");
    db.exec("DELETE FROM points_batches;");
    db.exec("DELETE FROM sales;");
    db.exec("DELETE FROM customers;");

    if (resetCrons) {
      db.exec("DELETE FROM cron_logs;");
    }

    if (resetFudo) {
      db.prepare(`
        UPDATE fudo_config
        SET last_sync_at = NULL,
            bearer_token = NULL,
            token_expires_at = NULL,
            updated_at = datetime('now')
      `).run();
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  const afterCounts = getTestDataCounts();

  return {
    success: true,
    deleted: {
      customers: beforeCounts.customers,
      sales: beforeCounts.sales,
      pointsBatches: beforeCounts.pointsBatches,
      pointsHistory: beforeCounts.pointsHistory,
      cronLogs: resetCrons ? beforeCounts.cronLogs : 0,
    },
    preserved: {
      adminUsers: afterCounts.preservedData.adminUsers,
      rewards: afterCounts.preservedData.rewards,
      csvPresets: afterCounts.preservedData.csvPresets,
    },
    fudoSyncReset: resetFudo,
    executedAt: new Date().toISOString(),
  };
}
