import { getDatabase, DEFAULT_RESTAURANT_ID } from "./db";
import {
  Customer,
  PointsHistory,
  Sale,
  PointsBatch,
  BirthdayStatus,
  CustomerPortalCard,
  CustomerTier,
  PortalRewardProgress,
} from "@/types/loyalty";
import { getActiveRewards } from "./settings-repo";
import { getActiveCampaigns } from "./campaign-repo";
import { isLegalEntityCuit } from "@/lib/validation/cuit";
import { checkRestaurantQuota } from "./restaurant-repo";
import crypto from "crypto";

export function findCustomerById(id: string, restaurantId?: string): Customer | null {
  const db = getDatabase();
  if (restaurantId) {
    const row = db.prepare("SELECT * FROM customers WHERE id = ? AND restaurant_id = ?").get(id, restaurantId) as Customer | undefined;
    return row || null;
  }
  const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as Customer | undefined;
  return row || null;
}

export function findCustomerByDocument(document_number: string, restaurantId: string = DEFAULT_RESTAURANT_ID): Customer | null {
  const db = getDatabase();
  const cleanDoc = document_number.trim();
  const row = db.prepare("SELECT * FROM customers WHERE document_number = ? AND restaurant_id = ?").get(cleanDoc, restaurantId) as Customer | undefined;
  return row || null;
}

export function findCustomerByPhone(phone: string, restaurantId: string = DEFAULT_RESTAURANT_ID): Customer | null {
  const db = getDatabase();
  const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
  if (!cleanPhone) return null;
  const row = db.prepare("SELECT * FROM customers WHERE phone LIKE ? AND restaurant_id = ? LIMIT 1").get(`%${cleanPhone}%`, restaurantId) as Customer | undefined;
  return row || null;
}

export function findCustomerByPosId(provider: string, externalId: string, restaurantId: string = DEFAULT_RESTAURANT_ID): Customer | null {
  const db = getDatabase();
  const cleanId = (externalId || "").trim();
  if (!cleanId) return null;

  if (provider.toUpperCase() === "FUDO") {
    const row = db.prepare("SELECT * FROM customers WHERE fudo_customer_id = ? AND restaurant_id = ?").get(cleanId, restaurantId) as Customer | undefined;
    if (row) return row;
  }

  return null;
}

export function linkCustomerPosId(customerId: string, provider: string, externalId: string): void {
  const db = getDatabase();
  const cleanId = (externalId || "").trim();
  if (!cleanId) return;

  if (provider.toUpperCase() === "FUDO") {
    db.prepare("UPDATE customers SET fudo_customer_id = ? WHERE id = ?").run(cleanId, customerId);
  }
}

export function findCustomerByFudoId(fudoId: string, restaurantId: string = DEFAULT_RESTAURANT_ID): Customer | null {
  return findCustomerByPosId("FUDO", fudoId, restaurantId);
}

export function linkFudoCustomerId(customerId: string, fudoCustomerId: string): void {
  linkCustomerPosId(customerId, "FUDO", fudoCustomerId);
}

export function searchCustomers(
  query: string,
  limit = 10,
  filter: "active" | "unenrolled" | "all" = "all",
  restaurantId: string = DEFAULT_RESTAURANT_ID
): Customer[] {
  const db = getDatabase();
  const clean = query.trim();

  let filterClause = "restaurant_id = ?";
  if (filter === "active") {
    filterClause += " AND loyalty_enrolled = 1";
  } else if (filter === "unenrolled") {
    filterClause += " AND loyalty_enrolled = 0";
  }

  if (!clean) {
    return db
      .prepare(`SELECT * FROM customers WHERE ${filterClause} ORDER BY points_balance DESC, created_at DESC LIMIT ?`)
      .all(restaurantId, limit) as Customer[];
  }

  const pattern = `%${clean}%`;
  const baseWhere = "(document_number LIKE ? OR phone LIKE ? OR name LIKE ?)";
  const finalWhere = `${filterClause} AND ${baseWhere}`;

  return db
    .prepare(`
      SELECT * FROM customers
      WHERE ${finalWhere}
      ORDER BY points_balance DESC
      LIMIT ?
    `)
    .all(restaurantId, pattern, pattern, pattern, limit) as Customer[];
}

export function createCustomer(
  data: {
    document_number: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    birth_date?: string | null;
    fudo_customer_id?: string | null;
    loyalty_enrolled?: boolean | number;
  },
  restaurantId: string = DEFAULT_RESTAURANT_ID
): Customer {
  const db = getDatabase();
  const cleanDoc = data.document_number.trim();

  // Regla de Negocio: Exclusión de Personas Jurídicas (Empresas)
  if (isLegalEntityCuit(cleanDoc)) {
    throw new Error(
      `No se permite registrar personas jurídicas o empresas (CUIT: ${cleanDoc}). El programa de fidelización es exclusivo para personas humanas.`
    );
  }

  // Comprobar cuota si el restaurante está en modo TRIAL_DEMO
  const quota = checkRestaurantQuota(restaurantId);
  if (!quota.allowed && quota.isTrial) {
    throw new Error(quota.reason || "Límite del modo de prueba alcanzado.");
  }

  const cleanName = data.name.trim();
  const cleanPhone = data.phone ? data.phone.trim() : null;
  const cleanEmail = data.email ? data.email.trim() : null;
  const cleanBirthDate = data.birth_date ? data.birth_date.trim() : null;
  const cleanFudoId = data.fudo_customer_id ? data.fudo_customer_id.trim() : null;
  const enrolledVal = data.loyalty_enrolled !== undefined ? (data.loyalty_enrolled ? 1 : 0) : 1;

  const existing = findCustomerByDocument(cleanDoc, restaurantId);
  if (existing) {
    if (cleanFudoId && !existing.fudo_customer_id) {
      linkFudoCustomerId(existing.id, cleanFudoId);
      return findCustomerById(existing.id, restaurantId)!;
    }
    return existing;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Comprobar si corresponde otorgar puntos de bienvenida para este restaurante
  const settings = db.prepare("SELECT * FROM loyalty_settings WHERE restaurant_id = ? ORDER BY id ASC LIMIT 1").get(restaurantId) as {
    welcome_points_enabled: number;
    welcome_points_amount: number;
    points_lifetime_days: number;
    points_expiration_days: number;
  } | undefined;

  const shouldAwardWelcome = enrolledVal === 1 && Boolean(settings?.welcome_points_enabled) && (settings?.welcome_points_amount || 0) > 0;
  const welcomePts = shouldAwardWelcome ? Number(settings!.welcome_points_amount) : 0;
  const welcomeAwarded = shouldAwardWelcome ? 1 : 0;

  const lifetimeDays = settings?.points_lifetime_days || 365;
  const expirationDays = settings?.points_expiration_days || 90;
  const newExpirationStr = welcomePts > 0 ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString() : null;

  db.prepare(`
    INSERT INTO customers (id, restaurant_id, fudo_customer_id, document_number, name, phone, email, birth_date, points_balance, total_spent, visit_count, points_expire_at, loyalty_enrolled, welcome_points_awarded, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
  `).run(id, restaurantId, cleanFudoId, cleanDoc, cleanName, cleanPhone, cleanEmail, cleanBirthDate, welcomePts, newExpirationStr, enrolledVal, welcomeAwarded, now);

  if (welcomePts > 0) {
    const batchId = crypto.randomUUID();
    const historyId = crypto.randomUUID();
    const batchExpiresAt = new Date(Date.now() + lifetimeDays * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO points_batches (id, restaurant_id, customer_id, points_earned, points_remaining, expires_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(batchId, restaurantId, id, welcomePts, welcomePts, batchExpiresAt, now);

    db.prepare(`
      INSERT INTO points_history (id, restaurant_id, customer_id, points, concept, created_at)
      VALUES (?, ?, ?, ?, '¡Bienvenido al programa de fidelidad! (Puntos de bienvenida)', ?)
    `).run(historyId, restaurantId, id, welcomePts, now);
  }

  return findCustomerById(id, restaurantId)!;
}

export function updateCustomerLoyaltyEnrollment(
  customerId: string,
  enrolled: boolean,
  restaurantId?: string
): { customer: Customer; welcomePointsAwarded: number } {
  const db = getDatabase();
  const customer = findCustomerById(customerId, restaurantId);
  if (!customer) {
    throw new Error(`Cliente no encontrado: ${customerId}`);
  }

  const effectiveRestoId = restaurantId || customer.restaurant_id || DEFAULT_RESTAURANT_ID;
  const enrolledVal = enrolled ? 1 : 0;
  let welcomePointsAwarded = 0;

  db.exec("BEGIN");
  try {
    db.prepare("UPDATE customers SET loyalty_enrolled = ? WHERE id = ?").run(enrolledVal, customerId);

    // Si se activa y no ha recibido previamente puntos de bienvenida (no retroactivo por ventas)
    if (enrolled && !customer.welcome_points_awarded) {
      const settings = db.prepare("SELECT * FROM loyalty_settings WHERE restaurant_id = ? ORDER BY id ASC LIMIT 1").get(effectiveRestoId) as {
        welcome_points_enabled: number;
        welcome_points_amount: number;
        points_lifetime_days: number;
        points_expiration_days: number;
      } | undefined;

      const shouldAward = Boolean(settings?.welcome_points_enabled) && (settings?.welcome_points_amount || 0) > 0;
      if (shouldAward) {
        welcomePointsAwarded = Number(settings!.welcome_points_amount);
        const lifetimeDays = settings?.points_lifetime_days || 365;
        const expirationDays = settings?.points_expiration_days || 90;
        const nowStr = new Date().toISOString();
        const batchId = crypto.randomUUID();
        const historyId = crypto.randomUUID();
        const batchExpiresAt = new Date(Date.now() + lifetimeDays * 24 * 60 * 60 * 1000).toISOString();
        const newBalance = customer.points_balance + welcomePointsAwarded;
        const newExpirationStr = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString();

        db.prepare(`
          INSERT INTO points_batches (id, restaurant_id, customer_id, points_earned, points_remaining, expires_at, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        `).run(batchId, effectiveRestoId, customerId, welcomePointsAwarded, welcomePointsAwarded, batchExpiresAt, nowStr);

        db.prepare(`
          INSERT INTO points_history (id, restaurant_id, customer_id, points, concept, created_at)
          VALUES (?, ?, ?, ?, '¡Bienvenido al programa de fidelidad! (Puntos de bienvenida)', ?)
        `).run(historyId, effectiveRestoId, customerId, welcomePointsAwarded, nowStr);

        db.prepare(`
          UPDATE customers
          SET points_balance = ?, points_expire_at = ?, welcome_points_awarded = 1
          WHERE id = ?
        `).run(newBalance, newExpirationStr, customerId);
      }
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return {
    customer: findCustomerById(customerId, effectiveRestoId)!,
    welcomePointsAwarded,
  };
}

export function getCustomerPointsHistory(customerId: string, limit = 20): PointsHistory[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM points_history
    WHERE customer_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(customerId, limit) as PointsHistory[];
}

export function getCustomerSales(customerId: string, limit = 20): Sale[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM sales
    WHERE customer_id = ?
    ORDER BY sale_date DESC
    LIMIT ?
  `).all(customerId, limit) as Sale[];
}

export function getCustomerActiveBatches(customerId: string): PointsBatch[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM points_batches
    WHERE customer_id = ? AND status = 'ACTIVE' AND points_remaining > 0
    ORDER BY expires_at ASC
  `).all(customerId) as PointsBatch[];
}

import { parseBirthday, formatBirthdayDisplay, MONTH_NAMES_ES } from "../loyalty/date-utils";
export { parseBirthday, formatBirthdayDisplay, MONTH_NAMES_ES };

export function checkBirthdayStatus(customer: Customer): BirthdayStatus {
  if (!customer.birth_date) {
    return {
      isEligible: false,
      daysDiff: 999,
      message: "Sin fecha de cumpleaños registrada",
      alreadyClaimedThisYear: false,
    };
  }

  const parsed = parseBirthday(customer.birth_date);
  if (!parsed) {
    return {
      isEligible: false,
      daysDiff: 999,
      message: "Formato de fecha inválido",
      alreadyClaimedThisYear: false,
    };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const alreadyClaimed = customer.last_birthday_reward_year === currentYear;

  const bdayThisYear = new Date(currentYear, parsed.month, parsed.day);
  const todayZero = new Date(currentYear, now.getMonth(), now.getDate());
  const diffTime = bdayThisYear.getTime() - todayZero.getTime();
  const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isToday = daysDiff === 0;
  const isBirthdayWeek = Math.abs(daysDiff) <= 3;

  if (alreadyClaimed) {
    return {
      isEligible: false,
      daysDiff,
      message: `Ya canjeó su cortesía anual de cumpleaños en ${currentYear}`,
      alreadyClaimedThisYear: true,
    };
  }

  if (isToday) {
    return {
      isEligible: true,
      daysDiff: 0,
      message: "¡Hoy es su cumpleaños! Habilitado para canjear cortesía de postre",
      alreadyClaimedThisYear: false,
    };
  }

  if (isBirthdayWeek) {
    const text =
      daysDiff > 0
        ? `Cumpleaños en ${daysDiff} días (${formatBirthdayDisplay(customer.birth_date)})`
        : `Cumplió hace ${Math.abs(daysDiff)} días (${formatBirthdayDisplay(customer.birth_date)})`;
    return {
      isEligible: true,
      daysDiff,
      message: `¡Semana de cumpleaños! (${text}) - Habilitado para canjear cortesía`,
      alreadyClaimedThisYear: false,
    };
  }

  const daysLabel = daysDiff > 0 ? `Faltan ${daysDiff} días` : `Pasaron ${Math.abs(daysDiff)} días`;
  return {
    isEligible: false,
    daysDiff,
    message: `Cumpleaños: ${formatBirthdayDisplay(customer.birth_date)} (${daysLabel})`,
    alreadyClaimedThisYear: false,
  };
}

export function calculateCustomerTier(visitsCount: number): CustomerTier {
  if (visitsCount >= 10) {
    return {
      name: "VIP Black",
      level: 4,
      badge_color: "bg-purple-950/40 text-purple-300 border-purple-500/50",
      gradient_class: "from-purple-950 via-slate-900 to-black border-purple-500/40",
      next_tier_name: null,
      visits_needed_for_next: 0,
      progress_percent: 100,
    };
  } else if (visitsCount >= 5) {
    const visitsForNext = 10 - visitsCount;
    const progress = Math.round(((visitsCount - 5) / 5) * 100);
    return {
      name: "Oro",
      level: 3,
      badge_color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      gradient_class: "from-amber-950/80 via-slate-900 to-stone-900 border-amber-500/40",
      next_tier_name: "VIP Black",
      visits_needed_for_next: visitsForNext,
      progress_percent: Math.min(100, Math.max(0, progress)),
    };
  } else if (visitsCount >= 2) {
    const visitsForNext = 5 - visitsCount;
    const progress = Math.round(((visitsCount - 2) / 3) * 100);
    return {
      name: "Plata",
      level: 2,
      badge_color: "bg-slate-500/20 text-slate-200 border-slate-400/40",
      gradient_class: "from-slate-900 via-slate-800 to-zinc-900 border-slate-400/40",
      next_tier_name: "Oro",
      visits_needed_for_next: visitsForNext,
      progress_percent: Math.min(100, Math.max(0, progress)),
    };
  } else {
    const visitsForNext = 2 - visitsCount;
    const progress = Math.round((visitsCount / 2) * 100);
    return {
      name: "Bronce",
      level: 1,
      badge_color: "bg-orange-950/30 text-orange-300 border-orange-700/40",
      gradient_class: "from-zinc-900 via-stone-900 to-neutral-900 border-amber-900/40",
      next_tier_name: "Plata",
      visits_needed_for_next: visitsForNext,
      progress_percent: Math.min(100, Math.max(0, progress)),
    };
  }
}

export function getCustomerPortalData(
  identifier: string,
  restaurantId: string = DEFAULT_RESTAURANT_ID,
  slug?: string
): CustomerPortalCard | null {
  if (!identifier) return null;

  // Clean identifier in case it comes with QR prefix or spaces
  let clean = identifier.trim();
  if (clean.startsWith("GASTRO:")) {
    // If format is GASTRO:<slug>:DNI:<dni> or GASTRO:DNI:<dni>
    const parts = clean.split(":");
    if (parts.length >= 4 && parts[2] === "DNI") {
      clean = parts[3].trim();
    } else if (parts.length >= 3 && parts[1] === "DNI") {
      clean = parts[2].trim();
    } else {
      clean = parts[parts.length - 1].trim();
    }
  }

  // 1. Try finding by Document (DNI) in this restaurant
  let customer = findCustomerByDocument(clean, restaurantId);

  // 2. If not found and is UUID format, find by ID
  if (!customer && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    customer = findCustomerById(clean, restaurantId);
  }

  // 3. If not found, try phone
  if (!customer && clean.replace(/[^0-9]/g, "").length >= 6) {
    customer = findCustomerByPhone(clean, restaurantId);
  }

  // 4. Fallback search within this restaurant
  if (!customer) {
    const matches = searchCustomers(clean, 2, "all", restaurantId);
    if (matches.length === 1) {
      customer = matches[0];
    }
  }

  if (!customer) return null;

  // Tier calculation
  const tier = calculateCustomerTier(customer.visit_count || 0);

  // Birthday status
  const birthday_status = checkBirthdayStatus(customer);

  // Inactivity expiration (Timer 1: 90 days)
  let days_until_inactivity_expiry: number | null = null;
  let is_expiring_soon = false;
  if (customer.points_expire_at) {
    const now = new Date();
    const expireDate = new Date(customer.points_expire_at);
    const diffMs = expireDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    days_until_inactivity_expiry = Math.max(0, diffDays);
    is_expiring_soon = days_until_inactivity_expiry <= 15 && customer.points_balance > 0;
  }

  // FIFO oldest active batch (Timer 2: 365 days)
  const activeBatches = getCustomerActiveBatches(customer.id);
  let next_expiring_batch: { points: number; expires_at: string; days_left: number } | null = null;
  if (activeBatches.length > 0) {
    const earliest = activeBatches[0];
    const now = new Date();
    const batchExpiry = new Date(earliest.expires_at);
    const diffMs = batchExpiry.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    next_expiring_batch = {
      points: earliest.points_remaining,
      expires_at: earliest.expires_at,
      days_left: diffDays,
    };
  }

  // Rewards progress for this restaurant
  const activeRewards = getActiveRewards(restaurantId);
  const rewards_progress: PortalRewardProgress[] = activeRewards.map((reward) => {
    if (reward.reward_type === "POINTS") {
      const is_redeemable = customer.points_balance >= reward.requirement_value;
      const progress = Math.min(100, Math.round((customer.points_balance / Math.max(1, reward.requirement_value)) * 100));
      return {
        reward,
        is_redeemable,
        progress_percent: progress,
        points_needed: Math.max(0, reward.requirement_value - customer.points_balance),
        visits_needed: 0,
      };
    } else if (reward.reward_type === "VISIT_MILESTONE") {
      const is_redeemable = customer.visit_count >= reward.requirement_value;
      const progress = Math.min(100, Math.round((customer.visit_count / Math.max(1, reward.requirement_value)) * 100));
      return {
        reward,
        is_redeemable,
        progress_percent: progress,
        points_needed: 0,
        visits_needed: Math.max(0, reward.requirement_value - customer.visit_count),
      };
    } else {
      // BIRTHDAY_GIFT
      const is_redeemable = birthday_status.isEligible;
      return {
        reward,
        is_redeemable,
        progress_percent: is_redeemable ? 100 : 0,
        points_needed: 0,
        visits_needed: 0,
      };
    }
  });

  // Recent History (last 10)
  const recent_history = getCustomerPointsHistory(customer.id, 10);

  // QR Payload: high compatibility string scoped to restaurant
  const qr_payload = slug
    ? `GASTRO:${slug}:DNI:${customer.document_number}`
    : `GASTRO:DNI:${customer.document_number}`;

  // Active Promotions & Campaigns for this restaurant
  const active_campaigns = getActiveCampaigns(restaurantId);

  return {
    customer,
    tier,
    birthday_status,
    days_until_inactivity_expiry,
    is_expiring_soon,
    next_expiring_batch,
    rewards_progress,
    recent_history,
    qr_payload,
    active_campaigns,
  };
}
