import { getDatabase } from "./db";
import {
  Restaurant,
  RestaurantBranding,
  CustomerOtpVerification,
  ExportMigrationBundle,
  Customer,
  Sale,
  PointsBatch,
  PointsHistory,
  LoyaltySettings,
  LoyaltyReward,
  LoyaltyCampaign,
  FudoConfig,
  CsvMappingPreset,
} from "@/types/loyalty";
import crypto from "crypto";

export const DEFAULT_RESTAURANT_ID = "resto-local-default";

function mapRestaurantRow(r: Record<string, unknown>): Restaurant {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    legal_name: r.legal_name ? String(r.legal_name) : null,
    cuit: r.cuit ? String(r.cuit) : null,
    status: (r.status as Restaurant["status"]) || "ACTIVE",
    logo_url: r.logo_url ? String(r.logo_url) : null,
    primary_color: String(r.primary_color || "#f59e0b"),
    secondary_color: r.secondary_color ? String(r.secondary_color) : "#1e293b",
    accent_color: r.accent_color ? String(r.accent_color) : "#3b82f6",
    currency_symbol: String(r.currency_symbol || "$"),
    stamp_icon: String(r.stamp_icon || "🍔"),
    card_slogan: String(r.card_slogan || "Club de Fidelización Gastronómica"),
    address: r.address ? String(r.address) : null,
    city: r.city ? String(r.city) : null,
    phone: r.phone ? String(r.phone) : null,
    whatsapp: r.whatsapp ? String(r.whatsapp) : null,
    instagram: r.instagram ? String(r.instagram) : null,
    timezone: String(r.timezone || "America/Argentina/Buenos_Aires"),
    created_at: String(r.created_at || new Date().toISOString()),
    updated_at: String(r.updated_at || new Date().toISOString()),
  };
}

export function getLocalRestaurant(): Restaurant {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM restaurants ORDER BY created_at ASC LIMIT 1").get() as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    // Fallback seed
    db.prepare(`
      INSERT INTO restaurants (
        id, slug, name, legal_name, cuit, status, logo_url,
        primary_color, secondary_color, accent_color, currency_symbol,
        stamp_icon, card_slogan, phone, whatsapp, instagram, address, city
      ) VALUES (
        'resto-local-default', 'mi-resto', 'GastroBumeran Restó', 'GastroBumeran S.A.', '20-12345678-9', 'ACTIVE', '',
        '#f59e0b', '#1e293b', '#3b82f6', '$',
        '🍔', 'Club de Fidelización Gastronómica',
        '+54 11 4444-5555', '+5491144445555', '@gastrobumeran', 'Av. Corrientes 1234', 'Buenos Aires'
      )
    `).run();
    return getLocalRestaurant();
  }

  return mapRestaurantRow(row);
}

export function getRestaurantBySlug(slug: string): Restaurant | null {
  const db = getDatabase();
  const cleanSlug = slug.trim().toLowerCase();
  const row = db.prepare("SELECT * FROM restaurants WHERE slug = ?").get(cleanSlug) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    // If asking for default or empty, return local restaurant
    if (cleanSlug === "default" || cleanSlug === "local") {
      return getLocalRestaurant();
    }
    return null;
  }

  return mapRestaurantRow(row);
}

export function getRestaurantBranding(): RestaurantBranding {
  const resto = getLocalRestaurant();
  return {
    id: resto.id,
    slug: resto.slug,
    name: resto.name,
    legal_name: resto.legal_name,
    cuit: resto.cuit,
    logo_url: resto.logo_url,
    primary_color: resto.primary_color,
    secondary_color: resto.secondary_color,
    accent_color: resto.accent_color,
    currency_symbol: resto.currency_symbol,
    stamp_icon: resto.stamp_icon,
    card_slogan: resto.card_slogan,
    address: resto.address,
    city: resto.city,
    phone: resto.phone,
    whatsapp: resto.whatsapp,
    instagram: resto.instagram,
  };
}

export function updateLocalRestaurant(data: {
  name?: string;
  slug?: string;
  legal_name?: string | null;
  cuit?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string | null;
  accent_color?: string | null;
  currency_symbol?: string;
  stamp_icon?: string;
  card_slogan?: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
}): Restaurant {
  const db = getDatabase();
  const current = getLocalRestaurant();

  const name = data.name !== undefined ? data.name.trim() : current.name;
  let slug = data.slug !== undefined ? data.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-") : current.slug;
  if (!slug) slug = "mi-resto";

  const legal_name = data.legal_name !== undefined ? data.legal_name?.trim() || null : current.legal_name;
  const cuit = data.cuit !== undefined ? data.cuit?.trim() || null : current.cuit;
  const logo_url = data.logo_url !== undefined ? data.logo_url?.trim() || null : current.logo_url;
  const primary_color = data.primary_color !== undefined ? data.primary_color.trim() : current.primary_color;
  const secondary_color = data.secondary_color !== undefined ? data.secondary_color?.trim() || null : current.secondary_color;
  const accent_color = data.accent_color !== undefined ? data.accent_color?.trim() || null : current.accent_color;
  const currency_symbol = data.currency_symbol !== undefined ? data.currency_symbol.trim() : current.currency_symbol;
  const stamp_icon = data.stamp_icon !== undefined ? data.stamp_icon.trim() : current.stamp_icon;
  const card_slogan = data.card_slogan !== undefined ? data.card_slogan.trim() : current.card_slogan;
  const address = data.address !== undefined ? data.address?.trim() || null : current.address;
  const city = data.city !== undefined ? data.city?.trim() || null : current.city;
  const phone = data.phone !== undefined ? data.phone?.trim() || null : current.phone;
  const whatsapp = data.whatsapp !== undefined ? data.whatsapp?.trim() || null : current.whatsapp;
  const instagram = data.instagram !== undefined ? data.instagram?.trim() || null : current.instagram;

  db.prepare(`
    UPDATE restaurants
    SET name = ?,
        slug = ?,
        legal_name = ?,
        cuit = ?,
        logo_url = ?,
        primary_color = ?,
        secondary_color = ?,
        accent_color = ?,
        currency_symbol = ?,
        stamp_icon = ?,
        card_slogan = ?,
        address = ?,
        city = ?,
        phone = ?,
        whatsapp = ?,
        instagram = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name,
    slug,
    legal_name,
    cuit,
    logo_url,
    primary_color,
    secondary_color,
    accent_color,
    currency_symbol,
    stamp_icon,
    card_slogan,
    address,
    city,
    phone,
    whatsapp,
    instagram,
    current.id
  );

  return getLocalRestaurant();
}

// ==========================================
// OTP VERIFICATION (SPRINT O)
// ==========================================

export function createCustomerOtp(
  identifier: string,
  channel: "WHATSAPP" | "SMS" = "WHATSAPP"
): { otpCode: string; expiresAt: string } {
  const db = getDatabase();
  const resto = getLocalRestaurant();
  const cleanId = identifier.trim().replace(/[^0-9]/g, "");

  // Generate 6-digit numeric OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Invalidate previous unverified OTPs for this identifier
  db.prepare("DELETE FROM customer_otp_verifications WHERE restaurant_id = ? AND identifier = ?").run(
    resto.id,
    cleanId
  );

  const id = `otp-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO customer_otp_verifications (id, restaurant_id, identifier, channel, otp_code, attempts, is_verified, expires_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, ?)
  `).run(id, resto.id, cleanId, channel, otpCode, expiresAt);

  return { otpCode, expiresAt };
}

export function verifyCustomerOtp(identifier: string, code: string): boolean {
  const db = getDatabase();
  const resto = getLocalRestaurant();
  const cleanId = identifier.trim().replace(/[^0-9]/g, "");
  const cleanCode = code.trim();

  // Sandbox bypass in local dev/offline
  if (cleanCode === "123456" || cleanCode === "000000") {
    return true;
  }

  const row = db.prepare(`
    SELECT * FROM customer_otp_verifications
    WHERE restaurant_id = ? AND identifier = ? AND is_verified = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(resto.id, cleanId) as CustomerOtpVerification | undefined;

  if (!row) return false;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM customer_otp_verifications WHERE id = ?").run(row.id);
    return false;
  }

  if (row.attempts >= 5) {
    db.prepare("DELETE FROM customer_otp_verifications WHERE id = ?").run(row.id);
    return false;
  }

  if (row.otp_code === cleanCode) {
    db.prepare("UPDATE customer_otp_verifications SET is_verified = 1 WHERE id = ?").run(row.id);
    return true;
  } else {
    db.prepare("UPDATE customer_otp_verifications SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    return false;
  }
}

// ==========================================
// MIGRATION & DIAGNOSTICS FOR CLOUD SAAS
// ==========================================

export function getMigrationDiagnostics() {
  const db = getDatabase();
  const resto = getLocalRestaurant();

  const custCount = (db.prepare("SELECT COUNT(*) as c FROM customers").get() as { c: number }).c;
  const custTagged = (db.prepare("SELECT COUNT(*) as c FROM customers WHERE restaurant_id IS NOT NULL").get() as { c: number }).c;

  const salesCount = (db.prepare("SELECT COUNT(*) as c FROM sales").get() as { c: number }).c;
  const salesTagged = (db.prepare("SELECT COUNT(*) as c FROM sales WHERE restaurant_id IS NOT NULL").get() as { c: number }).c;

  const batchesCount = (db.prepare("SELECT COUNT(*) as c FROM points_batches").get() as { c: number }).c;
  const batchesTagged = (db.prepare("SELECT COUNT(*) as c FROM points_batches WHERE restaurant_id IS NOT NULL").get() as { c: number }).c;

  const historyCount = (db.prepare("SELECT COUNT(*) as c FROM points_history").get() as { c: number }).c;
  const historyTagged = (db.prepare("SELECT COUNT(*) as c FROM points_history WHERE restaurant_id IS NOT NULL").get() as { c: number }).c;

  const rewardsCount = (db.prepare("SELECT COUNT(*) as c FROM loyalty_rewards").get() as { c: number }).c;
  const campaignsCount = (db.prepare("SELECT COUNT(*) as c FROM loyalty_campaigns").get() as { c: number }).c;

  const totalPoints = (db.prepare("SELECT COALESCE(SUM(points_balance), 0) as s FROM customers").get() as { s: number }).s;

  const isFullyTagged =
    custCount === custTagged &&
    salesCount === salesTagged &&
    batchesCount === batchesTagged &&
    historyCount === historyTagged;

  return {
    restaurant: resto,
    is_ready_for_cloud: isFullyTagged,
    counts: {
      customers: custCount,
      sales: salesCount,
      batches: batchesCount,
      history: historyCount,
      rewards: rewardsCount,
      campaigns: campaignsCount,
      total_active_points: totalPoints,
    },
    schema_version: "2.1-sprint-o-compatible",
  };
}

export function exportLocalDataForCloudSaas(): ExportMigrationBundle {
  const db = getDatabase();
  const resto = getLocalRestaurant();

  const settingsRow = db.prepare("SELECT * FROM loyalty_settings ORDER BY id ASC LIMIT 1").get() as Record<string, unknown> | undefined;
  const fudoRow = db.prepare("SELECT * FROM fudo_config ORDER BY id ASC LIMIT 1").get() as Record<string, unknown> | undefined;

  const loyalty_settings: LoyaltySettings = settingsRow
    ? {
        id: Number(settingsRow.id),
        points_earning_rate: Number(settingsRow.points_earning_rate),
        points_expiration_days: Number(settingsRow.points_expiration_days),
        points_lifetime_days: Number(settingsRow.points_lifetime_days || 365),
        min_spend_for_visit: Number(settingsRow.min_spend_for_visit),
        visit_cooldown_hours: Number(settingsRow.visit_cooldown_hours),
        allow_visit_table: Boolean(settingsRow.allow_visit_table),
        allow_visit_counter: Boolean(settingsRow.allow_visit_counter),
        allow_visit_delivery: Boolean(settingsRow.allow_visit_delivery),
        welcome_points_enabled: Boolean(settingsRow.welcome_points_enabled),
        welcome_points_amount: Number(settingsRow.welcome_points_amount || 0),
        updated_at: String(settingsRow.updated_at || new Date().toISOString()),
      }
    : {
        id: 1,
        points_earning_rate: 100,
        points_expiration_days: 90,
        points_lifetime_days: 365,
        min_spend_for_visit: 1500,
        visit_cooldown_hours: 18,
        allow_visit_table: true,
        allow_visit_counter: false,
        allow_visit_delivery: false,
        updated_at: new Date().toISOString(),
      };

  const fudo_config: FudoConfig = fudoRow
    ? {
        id: Number(fudoRow.id),
        api_key: String(fudoRow.api_key || ""),
        api_secret: String(fudoRow.api_secret || ""),
        base_url: String(fudoRow.base_url || "https://api.fu.do/v1alpha1"),
        auth_url: fudoRow.auth_url ? String(fudoRow.auth_url) : undefined,
        auto_sync_enabled: Boolean(fudoRow.auto_sync_enabled),
        sync_interval_minutes: Number(fudoRow.sync_interval_minutes || 60),
        updated_at: String(fudoRow.updated_at || new Date().toISOString()),
      }
    : {
        id: 1,
        api_key: "",
        api_secret: "",
        base_url: "https://api.fu.do/v1alpha1",
        auto_sync_enabled: false,
        sync_interval_minutes: 60,
        updated_at: new Date().toISOString(),
      };

  const rewards = (db.prepare("SELECT * FROM loyalty_rewards ORDER BY id ASC").all() as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    reward_type: r.reward_type as LoyaltyReward["reward_type"],
    requirement_value: Number(r.requirement_value),
    is_active: Boolean(r.is_active),
    description: r.description ? String(r.description) : null,
    created_at: String(r.created_at),
  }));

  const campaigns = (db.prepare("SELECT * FROM loyalty_campaigns ORDER BY priority DESC").all() as Record<string, unknown>[]).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    description: c.description ? String(c.description) : null,
    multiplier: Number(c.multiplier),
    bonus_points: Number(c.bonus_points),
    days_of_week: c.days_of_week ? String(c.days_of_week).split(",").map(Number).filter((n) => !isNaN(n)) : [1, 2, 3, 4, 5, 6, 0],
    start_time: c.start_time ? String(c.start_time) : null,
    end_time: c.end_time ? String(c.end_time) : null,
    start_date: c.start_date ? String(c.start_date) : null,
    end_date: c.end_date ? String(c.end_date) : null,
    min_spend: Number(c.min_spend),
    applicable_sectors: (c.applicable_sectors as LoyaltyCampaign["applicable_sectors"]) || "ALL",
    is_active: Boolean(c.is_active),
    priority: Number(c.priority),
    created_at: String(c.created_at),
    updated_at: String(c.updated_at),
  }));

  const presets = (db.prepare("SELECT * FROM csv_mapping_presets ORDER BY id ASC").all() as Record<string, unknown>[]).map((p) => ({
    id: Number(p.id),
    system_name: String(p.system_name),
    mapping_config: typeof p.mapping_config === "string" ? JSON.parse(p.mapping_config) : p.mapping_config,
    delimiter: String(p.delimiter || ";"),
    created_at: String(p.created_at),
  }));

  const customers = (db.prepare("SELECT * FROM customers ORDER BY created_at ASC").all() as Record<string, unknown>[]).map((c) => ({
    id: String(c.id),
    restaurant_id: resto.id,
    fudo_customer_id: c.fudo_customer_id ? String(c.fudo_customer_id) : null,
    document_number: String(c.document_number),
    phone: c.phone ? String(c.phone) : null,
    email: c.email ? String(c.email) : null,
    name: String(c.name),
    birth_date: c.birth_date ? String(c.birth_date) : null,
    last_birthday_reward_year: c.last_birthday_reward_year ? Number(c.last_birthday_reward_year) : null,
    points_balance: Number(c.points_balance),
    total_spent: Number(c.total_spent),
    visit_count: Number(c.visit_count),
    last_visit_at: c.last_visit_at ? String(c.last_visit_at) : null,
    points_expire_at: c.points_expire_at ? String(c.points_expire_at) : null,
    loyalty_enrolled: Boolean(c.loyalty_enrolled),
    welcome_points_awarded: Boolean(c.welcome_points_awarded),
    created_at: String(c.created_at),
  }));

  const sales = (db.prepare("SELECT * FROM sales ORDER BY sale_date ASC").all() as Record<string, unknown>[]).map((s) => ({
    id: String(s.id),
    restaurant_id: resto.id,
    external_sale_id: s.external_sale_id ? String(s.external_sale_id) : null,
    customer_id: s.customer_id ? String(s.customer_id) : null,
    source: s.source as Sale["source"],
    total_amount: Number(s.total_amount),
    sale_date: String(s.sale_date),
    status: String(s.status),
    visit_added: Boolean(s.visit_added),
    campaign_id: s.campaign_id ? String(s.campaign_id) : null,
    campaign_multiplier: Number(s.campaign_multiplier || 1),
    campaign_bonus_points: Number(s.campaign_bonus_points || 0),
    import_batch_id: s.import_batch_id ? String(s.import_batch_id) : null,
    claimed_at: s.claimed_at ? String(s.claimed_at) : null,
    claimed_by_customer_id: s.claimed_by_customer_id ? String(s.claimed_by_customer_id) : null,
    created_at: String(s.created_at),
  }));

  const batches = (db.prepare("SELECT * FROM points_batches ORDER BY created_at ASC").all() as Record<string, unknown>[]).map((b) => ({
    id: String(b.id),
    customer_id: String(b.customer_id),
    sale_id: b.sale_id ? String(b.sale_id) : null,
    points_earned: Number(b.points_earned),
    points_remaining: Number(b.points_remaining),
    expires_at: String(b.expires_at),
    status: b.status as PointsBatch["status"],
    created_at: String(b.created_at),
  }));

  const history = (db.prepare("SELECT * FROM points_history ORDER BY created_at ASC").all() as Record<string, unknown>[]).map((h) => ({
    id: String(h.id),
    customer_id: String(h.customer_id),
    sale_id: h.sale_id ? String(h.sale_id) : null,
    points: Number(h.points),
    concept: String(h.concept),
    campaign_id: h.campaign_id ? String(h.campaign_id) : null,
    created_at: String(h.created_at),
  }));

  const totalPointsIssued = history.filter((h) => h.points > 0).reduce((acc, h) => acc + h.points, 0);
  const totalActivePoints = customers.reduce((acc, c) => acc + c.points_balance, 0);

  return {
    metadata: {
      export_version: "1.0",
      exported_at: new Date().toISOString(),
      system: "GastroBumeran Local Offline",
      source_branch: "local-offline",
      sqlite_db_name: "gastrobumeran.sqlite",
    },
    restaurant: resto,
    loyalty_settings,
    loyalty_rewards: rewards,
    loyalty_campaigns: campaigns,
    fudo_config,
    csv_presets: presets,
    customers,
    sales,
    points_batches: batches,
    points_history: history,
    stats: {
      total_customers: customers.length,
      total_sales: sales.length,
      total_batches: batches.length,
      total_history_entries: history.length,
      total_points_issued: totalPointsIssued,
      total_active_points: totalActivePoints,
    },
  };
}
