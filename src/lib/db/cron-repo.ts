import { getDatabase } from "./db";
import { CronLog } from "@/types/loyalty";

export function logCronExecution(
  data: {
    job_name: string;
    status: "SUCCESS" | "ERROR" | "WARNING";
    summary: string;
    details?: Record<string, unknown> | null;
    duration_ms: number;
  },
  restaurantId?: string | null
): CronLog {
  const db = getDatabase();
  const detailsJson = data.details ? JSON.stringify(data.details) : null;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO cron_logs (restaurant_id, job_name, status, summary, details_json, executed_at, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(restaurantId || null, data.job_name, data.status, data.summary, detailsJson, now, data.duration_ms);

  const lastId = (db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }).id;

  return {
    id: lastId,
    restaurant_id: restaurantId || null,
    job_name: data.job_name,
    status: data.status,
    summary: data.summary,
    details_json: detailsJson,
    executed_at: now,
    duration_ms: data.duration_ms,
  };
}

export function getCronLogs(limit = 20, restaurantId?: string | null): CronLog[] {
  const db = getDatabase();
  if (restaurantId) {
    return db
      .prepare("SELECT * FROM cron_logs WHERE restaurant_id = ? ORDER BY executed_at DESC, id DESC LIMIT ?")
      .all(restaurantId, limit) as CronLog[];
  }
  return db
    .prepare("SELECT * FROM cron_logs ORDER BY executed_at DESC, id DESC LIMIT ?")
    .all(limit) as CronLog[];
}

export function clearOldCronLogs(days = 30, restaurantId?: string | null): void {
  const db = getDatabase();
  if (restaurantId) {
    db.prepare(`
      DELETE FROM cron_logs
      WHERE restaurant_id = ? AND datetime(executed_at) < datetime('now', '-' || ? || ' days')
    `).run(restaurantId, days);
  } else {
    db.prepare(`
      DELETE FROM cron_logs
      WHERE datetime(executed_at) < datetime('now', '-' || ? || ' days')
    `).run(days);
  }
}
