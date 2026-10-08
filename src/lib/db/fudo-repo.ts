import { getDatabase, DEFAULT_RESTAURANT_ID } from "./db";
import { FudoConfig } from "@/types/loyalty";

export function getFudoConfig(restaurantId: string = DEFAULT_RESTAURANT_ID): FudoConfig {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM fudo_config WHERE restaurant_id = ? ORDER BY id ASC LIMIT 1").get(restaurantId) as
    | {
        id: number;
        restaurant_id: string;
        api_key: string;
        api_secret: string;
        base_url: string;
        auth_url?: string | null;
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
      INSERT INTO fudo_config (restaurant_id, api_key, api_secret, base_url, auth_url, auto_sync_enabled, sync_interval_minutes)
      VALUES (?, 'DEMO_FUDO_KEY_RESTO99', 'DEMO_FUDO_SECRET_XYZ888', 'https://api.fu.do/v1alpha1', 'https://auth.fu.do/api', 0, 60)
    `).run(restaurantId);
    return getFudoConfig(restaurantId);
  }

  // Only use global env fallback for the default demo resto
  const isDefaultDemo = restaurantId === DEFAULT_RESTAURANT_ID;
  const envKey = isDefaultDemo ? process.env.FUDO_API_KEY?.trim() : undefined;
  const envSecret = isDefaultDemo ? process.env.FUDO_API_SECRET?.trim() : undefined;
  const envBaseUrl = isDefaultDemo ? process.env.FUDO_BASE_URL?.trim() : undefined;
  const envAuthUrl = isDefaultDemo ? process.env.FUDO_AUTH_URL?.trim() : undefined;

  return {
    id: row.id,
    restaurant_id: row.restaurant_id || restaurantId,
    api_key: envKey || row.api_key,
    api_secret: envSecret || row.api_secret,
    base_url: envBaseUrl || row.base_url,
    auth_url: envAuthUrl || row.auth_url || "https://auth.fu.do/api",
    bearer_token: row.bearer_token,
    token_expires_at: row.token_expires_at,
    last_sync_at: row.last_sync_at,
    auto_sync_enabled: Boolean(row.auto_sync_enabled),
    sync_interval_minutes: row.sync_interval_minutes,
    updated_at: row.updated_at,
  };
}

export function updateFudoConfig(
  input: {
    api_key?: string;
    api_secret?: string;
    base_url?: string;
    auth_url?: string;
    auto_sync_enabled?: boolean;
    sync_interval_minutes?: number;
  },
  restaurantId: string = DEFAULT_RESTAURANT_ID
): FudoConfig {
  const db = getDatabase();
  const current = getFudoConfig(restaurantId);

  const apiKey = input.api_key !== undefined ? input.api_key.trim() : current.api_key;
  const apiSecret = input.api_secret !== undefined ? input.api_secret.trim() : current.api_secret;
  const baseUrl = input.base_url !== undefined ? input.base_url.trim() : current.base_url;
  const authUrl = input.auth_url !== undefined ? input.auth_url.trim() : (current.auth_url || "https://auth.fu.do/api");
  const autoSync = input.auto_sync_enabled !== undefined ? (input.auto_sync_enabled ? 1 : 0) : current.auto_sync_enabled ? 1 : 0;
  const interval = input.sync_interval_minutes !== undefined ? Math.max(1, Number(input.sync_interval_minutes)) : current.sync_interval_minutes;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE fudo_config
    SET api_key = ?, api_secret = ?, base_url = ?, auth_url = ?, auto_sync_enabled = ?, sync_interval_minutes = ?, updated_at = ?
    WHERE id = ? AND restaurant_id = ?
  `).run(apiKey, apiSecret, baseUrl, authUrl, autoSync, interval, now, current.id, restaurantId);

  return getFudoConfig(restaurantId);
}

export function updateFudoToken(bearerToken: string, tokenExpiresAt: string, restaurantId: string = DEFAULT_RESTAURANT_ID): void {
  const db = getDatabase();
  const current = getFudoConfig(restaurantId);
  db.prepare(`
    UPDATE fudo_config
    SET bearer_token = ?, token_expires_at = ?, updated_at = datetime('now')
    WHERE id = ? AND restaurant_id = ?
  `).run(bearerToken, tokenExpiresAt, current.id, restaurantId);
}

export function updateFudoLastSync(lastSyncAt: string, restaurantId: string = DEFAULT_RESTAURANT_ID): void {
  const db = getDatabase();
  const current = getFudoConfig(restaurantId);
  db.prepare(`
    UPDATE fudo_config
    SET last_sync_at = ?, updated_at = datetime('now')
    WHERE id = ? AND restaurant_id = ?
  `).run(lastSyncAt, current.id, restaurantId);
}
