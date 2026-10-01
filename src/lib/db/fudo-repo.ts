import { getDatabase } from "./db";
import { FudoConfig } from "@/types/loyalty";

export function getFudoConfig(): FudoConfig {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM fudo_config ORDER BY id ASC LIMIT 1").get() as
    | {
        id: number;
        api_key: string;
        api_secret: string;
        base_url: string;
        bearer_token?: string | null;
        token_expires_at?: string | null;
        last_sync_at?: string | null;
        auto_sync_enabled: number;
        sync_interval_minutes: number;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    db.prepare(`
      INSERT INTO fudo_config (api_key, api_secret, base_url, auto_sync_enabled, sync_interval_minutes)
      VALUES ('DEMO_FUDO_KEY_RESTO99', 'DEMO_FUDO_SECRET_XYZ888', 'https://api.fu.do/v1alpha1', 0, 60)
    `).run();
    return getFudoConfig();
  }

  return {
    id: row.id,
    api_key: row.api_key,
    api_secret: row.api_secret,
    base_url: row.base_url,
    bearer_token: row.bearer_token,
    token_expires_at: row.token_expires_at,
    last_sync_at: row.last_sync_at,
    auto_sync_enabled: Boolean(row.auto_sync_enabled),
    sync_interval_minutes: row.sync_interval_minutes,
    updated_at: row.updated_at,
  };
}

export function updateFudoConfig(input: {
  api_key?: string;
  api_secret?: string;
  base_url?: string;
  auto_sync_enabled?: boolean;
  sync_interval_minutes?: number;
}): FudoConfig {
  const db = getDatabase();
  const current = getFudoConfig();

  const apiKey = input.api_key !== undefined ? input.api_key.trim() : current.api_key;
  const apiSecret = input.api_secret !== undefined ? input.api_secret.trim() : current.api_secret;
  const baseUrl = input.base_url !== undefined ? input.base_url.trim() : current.base_url;
  const autoSync = input.auto_sync_enabled !== undefined ? (input.auto_sync_enabled ? 1 : 0) : current.auto_sync_enabled ? 1 : 0;
  const interval = input.sync_interval_minutes !== undefined ? Math.max(5, input.sync_interval_minutes) : current.sync_interval_minutes;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE fudo_config
    SET api_key = ?, api_secret = ?, base_url = ?, auto_sync_enabled = ?, sync_interval_minutes = ?, updated_at = ?
    WHERE id = ?
  `).run(apiKey, apiSecret, baseUrl, autoSync, interval, now, current.id);

  return getFudoConfig();
}

export function updateFudoToken(bearerToken: string, tokenExpiresAt: string): void {
  const db = getDatabase();
  const current = getFudoConfig();
  db.prepare(`
    UPDATE fudo_config
    SET bearer_token = ?, token_expires_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(bearerToken, tokenExpiresAt, current.id);
}

export function updateFudoLastSync(lastSyncAt: string): void {
  const db = getDatabase();
  const current = getFudoConfig();
  db.prepare(`
    UPDATE fudo_config
    SET last_sync_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(lastSyncAt, current.id);
}
