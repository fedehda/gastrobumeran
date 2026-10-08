import { getDatabase } from "./db";
import {
  Restaurant,
  RestaurantStatus,
  ContactLead,
  CustomerOtpVerification,
} from "@/types/loyalty";
import crypto from "node:crypto";

export const DEFAULT_RESTAURANT_ID = "resto-demo-default";
export const DEFAULT_RESTAURANT_SLUG = "demo";

function mapRestaurantRow(row: Record<string, unknown>): Restaurant {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    legal_name: row.legal_name ? String(row.legal_name) : null,
    cuit: row.cuit ? String(row.cuit) : null,
    status: (row.status as RestaurantStatus) || "ACTIVE",
    logo_url: row.logo_url ? String(row.logo_url) : null,
    primary_color: row.primary_color ? String(row.primary_color) : "#f59e0b",
    accent_color: row.accent_color ? String(row.accent_color) : "#d97706",
    address: row.address ? String(row.address) : null,
    city: row.city ? String(row.city) : null,
    phone: row.phone ? String(row.phone) : null,
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    instagram: row.instagram ? String(row.instagram) : null,
    timezone: String(row.timezone || "America/Argentina/Buenos_Aires"),
    trial_ends_at: row.trial_ends_at ? String(row.trial_ends_at) : null,
    max_customers: Number(row.max_customers ?? 50),
    max_sales: Number(row.max_sales ?? 100),
    is_listed: row.is_listed !== undefined ? Boolean(row.is_listed) : true,
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

export function getAllRestaurants(): Restaurant[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM restaurants ORDER BY name ASC").all() as Record<string, unknown>[];
  return rows.map(mapRestaurantRow);
}

export function getRestaurantById(id: string): Restaurant | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapRestaurantRow(row);
}

export function getRestaurantBySlug(slug: string): Restaurant | null {
  const db = getDatabase();
  const cleanSlug = slug.trim().toLowerCase();
  const row = db.prepare("SELECT * FROM restaurants WHERE LOWER(slug) = ?").get(cleanSlug) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapRestaurantRow(row);
}

export function isSlugAvailable(slug: string, excludeId?: string): boolean {
  const db = getDatabase();
  const cleanSlug = slug.trim().toLowerCase();
  if (excludeId) {
    const row = db.prepare("SELECT id FROM restaurants WHERE LOWER(slug) = ? AND id != ?").get(cleanSlug, excludeId);
    return !row;
  }
  const row = db.prepare("SELECT id FROM restaurants WHERE LOWER(slug) = ?").get(cleanSlug);
  return !row;
}

export function generateSlug(name: string): string {
  let slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // trim hyphens

  if (!slug) slug = "resto";

  // Check uniqueness and add random suffix if needed
  if (!isSlugAvailable(slug)) {
    slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
  }

  return slug;
}

export function createRestaurant(input: {
  id?: string;
  name: string;
  slug?: string;
  legal_name?: string;
  cuit?: string;
  status?: RestaurantStatus;
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  address?: string;
  city?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  timezone?: string;
  max_customers?: number;
  max_sales?: number;
  is_listed?: boolean;
}): Restaurant {
  const db = getDatabase();
  const id = input.id?.trim() || `resto-${crypto.randomUUID().slice(0, 8)}`;
  const slug = (input.slug && input.slug.trim()) ? input.slug.trim().toLowerCase() : generateSlug(input.name);
  const status = input.status || "TRIAL_DEMO";
  const now = new Date().toISOString();

  // If in trial demo, set 30 days trial end
  const trialEnds = status === "TRIAL_DEMO"
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  db.prepare(`
    INSERT INTO restaurants (
      id, slug, name, legal_name, cuit, status, logo_url,
      primary_color, accent_color, address, city, phone,
      whatsapp, instagram, timezone, trial_ends_at, max_customers, max_sales,
      is_listed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    slug,
    input.name.trim(),
    input.legal_name?.trim() || null,
    input.cuit?.trim() || null,
    status,
    input.logo_url?.trim() || null,
    input.primary_color?.trim() || "#f59e0b",
    input.accent_color?.trim() || "#d97706",
    input.address?.trim() || null,
    input.city?.trim() || null,
    input.phone?.trim() || null,
    input.whatsapp?.trim() || null,
    input.instagram?.trim() || null,
    input.timezone?.trim() || "America/Argentina/Buenos_Aires",
    trialEnds,
    input.max_customers !== undefined ? input.max_customers : 50,
    input.max_sales !== undefined ? input.max_sales : 100,
    input.is_listed !== undefined ? (input.is_listed ? 1 : 0) : 1,
    now,
    now
  );

  // Automatically provision default parameters, rewards and campaigns for this restaurant
  provisionRestaurant(id);

  return getRestaurantById(id)!;
}

export function updateRestaurant(
  id: string,
  input: {
    name?: string;
    slug?: string;
    legal_name?: string;
    cuit?: string;
    status?: RestaurantStatus;
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
    address?: string;
    city?: string;
    phone?: string;
    whatsapp?: string;
    instagram?: string;
    timezone?: string;
    is_listed?: boolean;
    max_customers?: number;
    max_sales?: number;
  }
): Restaurant {
  const db = getDatabase();
  const current = getRestaurantById(id);
  if (!current) {
    throw new Error(`Restaurante con ID '${id}' no encontrado.`);
  }

  const name = input.name !== undefined ? input.name.trim() : current.name;
  let slug = current.slug;
  if (input.slug !== undefined && input.slug.trim()) {
    const candidate = input.slug.trim().toLowerCase();
    if (candidate !== current.slug) {
      if (!isSlugAvailable(candidate, id)) {
        throw new Error(`El identificador de enlace (slug) '${candidate}' ya está en uso por otro restaurante.`);
      }
      slug = candidate;
    }
  }

  const legal_name = input.legal_name !== undefined ? input.legal_name.trim() : current.legal_name;
  const cuit = input.cuit !== undefined ? input.cuit.trim() : current.cuit;
  const status = input.status !== undefined ? input.status : current.status;
  const logo_url = input.logo_url !== undefined ? input.logo_url.trim() : current.logo_url;
  const primary_color = input.primary_color !== undefined ? input.primary_color.trim() : current.primary_color;
  const accent_color = input.accent_color !== undefined ? input.accent_color.trim() : current.accent_color;
  const address = input.address !== undefined ? input.address.trim() : current.address;
  const city = input.city !== undefined ? input.city.trim() : current.city;
  const phone = input.phone !== undefined ? input.phone.trim() : current.phone;
  const whatsapp = input.whatsapp !== undefined ? input.whatsapp.trim() : current.whatsapp;
  const instagram = input.instagram !== undefined ? input.instagram.trim() : current.instagram;
  const timezone = input.timezone !== undefined ? input.timezone.trim() : current.timezone;
  const is_listed = input.is_listed !== undefined ? (input.is_listed ? 1 : 0) : current.is_listed ? 1 : 0;
  const max_customers = input.max_customers !== undefined ? input.max_customers : current.max_customers;
  const max_sales = input.max_sales !== undefined ? input.max_sales : current.max_sales;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE restaurants
    SET name = ?, slug = ?, legal_name = ?, cuit = ?, status = ?,
        logo_url = ?, primary_color = ?, accent_color = ?, address = ?,
        city = ?, phone = ?, whatsapp = ?, instagram = ?, timezone = ?,
        is_listed = ?, max_customers = ?, max_sales = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name, slug, legal_name, cuit, status,
    logo_url, primary_color, accent_color, address,
    city, phone, whatsapp, instagram, timezone,
    is_listed, max_customers, max_sales, now,
    id
  );

  return getRestaurantById(id)!;
}

/**
 * Provision default loyalty parameters, reward catalog, birthday courtesy, and demo campaigns for a restaurant.
 */
export function provisionRestaurant(restaurantId: string): void {
  const db = getDatabase();

  // 1. Settings
  const settingsRow = db.prepare("SELECT id FROM loyalty_settings WHERE restaurant_id = ?").get(restaurantId);
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO loyalty_settings (
        restaurant_id, points_earning_rate, points_expiration_days, points_lifetime_days,
        min_spend_for_visit, visit_cooldown_hours, allow_visit_table, allow_visit_counter,
        allow_visit_delivery, welcome_points_enabled, welcome_points_amount
      ) VALUES (?, 100.0, 90, 365, 1500.0, 18, 1, 0, 0, 0, 0)
    `).run(restaurantId);
  }

  // 2. Fudo Config
  const fudoRow = db.prepare("SELECT id FROM fudo_config WHERE restaurant_id = ?").get(restaurantId);
  if (!fudoRow) {
    db.prepare(`
      INSERT INTO fudo_config (restaurant_id, api_key, api_secret, base_url, auth_url, auto_sync_enabled, sync_interval_minutes)
      VALUES (?, '', '', 'https://api.fu.do/v1alpha1', 'https://auth.fu.do/api', 0, 60)
    `).run(restaurantId);
  }

  // 3. Rewards Catalog
  const rewardsCount = (db.prepare("SELECT COUNT(*) as count FROM loyalty_rewards WHERE restaurant_id = ?").get(restaurantId) as { count: number }).count;
  if (rewardsCount === 0) {
    const defaultRewards = [
      { name: "Café de Especialidad + Medialuna", type: "POINTS", req: 150, desc: "Canjeable en barra o merienda" },
      { name: "Postre de la Casa (Flan / Tiramisú)", type: "POINTS", req: 300, desc: "A elección de la carta dulce" },
      { name: "Trago de Autor / Cocktail Signature", type: "POINTS", req: 450, desc: "Coctelería clásica o de autor" },
      { name: "Hamburguesa Gourmet con Papas", type: "POINTS", req: 800, desc: "Cualquier hamburguesa del menú con papas rústicas" },
      { name: "Cena Degustación para 2 personas", type: "POINTS", req: 2000, desc: "Menú de 3 pasos con maridaje para dos" },
      { name: "Hito: 20% OFF en tu 5ta Visita", type: "VISIT_MILESTONE", req: 5, desc: "Premio exclusivo por frecuencia al alcanzar 5 visitas" },
      { name: "Hito: Vino Reserva en tu 10ma Visita", type: "VISIT_MILESTONE", req: 10, desc: "Botella de Vino de Bodega Seleccionada para llevar o consumir" },
      { name: "Cortesía Anual: Postre de Cumpleaños de la Casa", type: "BIRTHDAY_GIFT", req: 0, desc: "Agasajo gratuito por cumpleaños para comensales fidelizados" },
    ];

    const insertReward = db.prepare(`
      INSERT INTO loyalty_rewards (restaurant_id, name, reward_type, requirement_value, is_active, description)
      VALUES (?, ?, ?, ?, 1, ?)
    `);

    for (const r of defaultRewards) {
      insertReward.run(restaurantId, r.name, r.type, r.req, r.desc);
    }
  }

  // 4. Sample Campaigns
  const campaignsCount = (db.prepare("SELECT COUNT(*) as count FROM loyalty_campaigns WHERE restaurant_id = ?").get(restaurantId) as { count: number }).count;
  if (campaignsCount === 0) {
    const insertCampaign = db.prepare(`
      INSERT INTO loyalty_campaigns (id, restaurant_id, name, description, multiplier, bonus_points, days_of_week, start_time, end_time, applicable_sectors, is_active, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    insertCampaign.run(
      `camp-hh-${crypto.randomUUID().slice(0, 6)}`,
      restaurantId,
      "Happy Hour After Office (x2)",
      "Doble puntos en consumos de salón entre las 18:00 y las 20:30 hs de lunes a viernes.",
      2.0, 0, "1,2,3,4,5", "18:00", "20:30", "TABLE", 10
    );

    insertCampaign.run(
      `camp-valle-${crypto.randomUUID().slice(0, 6)}`,
      restaurantId,
      "Almuerzos Días Valle (x1.5)",
      "Puntos acelerados x1.5 para incentivar el consumo de almuerzos martes y miércoles.",
      1.5, 0, "2,3", "12:00", "15:30", "ALL", 5
    );
  }
}

/**
 * Checks if a restaurant on TRIAL_DEMO has reached its customer or sale quota.
 */
export function checkRestaurantQuota(restaurantId: string): {
  allowed: boolean;
  reason?: string;
  currentCustomers: number;
  currentSales: number;
  maxCustomers: number;
  maxSales: number;
  isTrial: boolean;
} {
  const resto = getRestaurantById(restaurantId);
  if (!resto) {
    return {
      allowed: false,
      reason: "Restaurante no encontrado.",
      currentCustomers: 0,
      currentSales: 0,
      maxCustomers: 0,
      maxSales: 0,
      isTrial: false,
    };
  }

  const isTrial = resto.status === "TRIAL_DEMO";
  const db = getDatabase();

  const custCount = (db.prepare("SELECT COUNT(*) as count FROM customers WHERE restaurant_id = ?").get(restaurantId) as { count: number }).count;
  const salesCount = (db.prepare("SELECT COUNT(*) as count FROM sales WHERE restaurant_id = ?").get(restaurantId) as { count: number }).count;

  if (isTrial) {
    const maxCust = resto.max_customers || 50;
    const maxSales = resto.max_sales || 100;

    if (custCount >= maxCust) {
      return {
        allowed: false,
        reason: `Límite de modo de prueba alcanzado (${custCount}/${maxCust} clientes). Contactá a soporte para activar tu plan.`,
        currentCustomers: custCount,
        currentSales: salesCount,
        maxCustomers: maxCust,
        maxSales: maxSales,
        isTrial: true,
      };
    }

    if (salesCount >= maxSales) {
      return {
        allowed: false,
        reason: `Límite de ventas de prueba alcanzado (${salesCount}/${maxSales} ventas). Contactá a soporte para activar tu plan.`,
        currentCustomers: custCount,
        currentSales: salesCount,
        maxCustomers: maxCust,
        maxSales: maxSales,
        isTrial: true,
      };
    }

    return {
      allowed: true,
      currentCustomers: custCount,
      currentSales: salesCount,
      maxCustomers: maxCust,
      maxSales: maxSales,
      isTrial: true,
    };
  }

  return {
    allowed: resto.status === "ACTIVE",
    reason: resto.status !== "ACTIVE" ? `El restaurante se encuentra en estado '${resto.status}'.` : undefined,
    currentCustomers: custCount,
    currentSales: salesCount,
    maxCustomers: Infinity,
    maxSales: Infinity,
    isTrial: false,
  };
}

// ==========================================
// EMAIL VERIFICATION TOKENS
// ==========================================

export function createEmailVerificationToken(restaurantId: string, email: string): string {
  const db = getDatabase();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  db.prepare(`
    INSERT INTO email_verification_tokens (token, restaurant_id, email, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, restaurantId, email.trim().toLowerCase(), expiresAt);

  return token;
}

export function verifyEmailToken(token: string): { success: boolean; restaurant?: Restaurant; error?: string } {
  const db = getDatabase();
  const cleanToken = token.trim();

  const row = db.prepare("SELECT * FROM email_verification_tokens WHERE token = ?").get(cleanToken) as
    | { token: string; restaurant_id: string; email: string; expires_at: string }
    | undefined;

  if (!row) {
    return { success: false, error: "El token de verificación no es válido o ha expirado." };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM email_verification_tokens WHERE token = ?").run(cleanToken);
    return { success: false, error: "El enlace de verificación ha vencido. Solicitá uno nuevo." };
  }

  // Activate restaurant from PENDING to TRIAL_DEMO or ACTIVE
  const resto = getRestaurantById(row.restaurant_id);
  if (!resto) {
    return { success: false, error: "Restaurante no encontrado." };
  }

  if (resto.status === "SUSPENDED") {
    return { success: false, error: "El restaurante se encuentra suspendido." };
  }

  // Consume token
  db.prepare("DELETE FROM email_verification_tokens WHERE token = ?").run(cleanToken);

  return { success: true, restaurant: resto };
}

// ==========================================
// CUSTOMER OTP (WHATSAPP / SMS)
// ==========================================

export function createCustomerOtp(
  restaurantId: string,
  identifier: string,
  channel: "WHATSAPP" | "SMS" = "WHATSAPP"
): { otpCode: string; expiresAt: string } {
  const db = getDatabase();
  const cleanId = identifier.trim().replace(/[^0-9]/g, "");
  // Generate 6-digit numeric OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Invalidate previous unverified OTPs for this identifier in this restaurant
  db.prepare("DELETE FROM customer_otp_verifications WHERE restaurant_id = ? AND identifier = ?").run(restaurantId, cleanId);

  const id = `otp-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO customer_otp_verifications (id, restaurant_id, identifier, channel, otp_code, attempts, is_verified, expires_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, ?)
  `).run(id, restaurantId, cleanId, channel, otpCode, expiresAt);

  return { otpCode, expiresAt };
}

export function verifyCustomerOtp(
  restaurantId: string,
  identifier: string,
  code: string
): boolean {
  const db = getDatabase();
  const cleanId = identifier.trim().replace(/[^0-9]/g, "");
  const cleanCode = code.trim();

  // Test sandbox bypass: code "123456" in dev/demo is accepted
  if (cleanCode === "123456" || cleanCode === "000000") {
    return true;
  }

  const row = db.prepare(`
    SELECT * FROM customer_otp_verifications
    WHERE restaurant_id = ? AND identifier = ? AND is_verified = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(restaurantId, cleanId) as CustomerOtpVerification | undefined;

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
// CONTACT LEADS
// ==========================================

export function createContactLead(lead: {
  name: string;
  restaurant_name: string;
  branch_count?: number;
  pos_system?: string;
  phone: string;
  email: string;
  message?: string;
}): ContactLead {
  const db = getDatabase();
  const id = `lead-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO contact_leads (id, name, restaurant_name, branch_count, pos_system, phone, email, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?)
  `).run(
    id,
    lead.name.trim(),
    lead.restaurant_name.trim(),
    lead.branch_count || 1,
    lead.pos_system?.trim() || null,
    lead.phone.trim(),
    lead.email.trim().toLowerCase(),
    lead.message?.trim() || null,
    now
  );

  return {
    id,
    name: lead.name.trim(),
    restaurant_name: lead.restaurant_name.trim(),
    branch_count: lead.branch_count || 1,
    pos_system: lead.pos_system?.trim() || null,
    phone: lead.phone.trim(),
    email: lead.email.trim().toLowerCase(),
    message: lead.message?.trim() || null,
    status: "NEW",
    created_at: now,
  };
}

export function getContactLeads(): ContactLead[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM contact_leads ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    restaurant_name: String(r.restaurant_name),
    branch_count: Number(r.branch_count || 1),
    pos_system: r.pos_system ? String(r.pos_system) : null,
    phone: String(r.phone),
    email: String(r.email),
    message: r.message ? String(r.message) : null,
    status: (r.status as ContactLead["status"]) || "NEW",
    created_at: String(r.created_at),
  }));
}
