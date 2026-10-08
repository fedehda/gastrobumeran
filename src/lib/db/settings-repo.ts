import { getDatabase, DEFAULT_RESTAURANT_ID } from "./db";
import { LoyaltySettings, LoyaltyReward } from "@/types/loyalty";

export function getLoyaltySettings(restaurantId: string = DEFAULT_RESTAURANT_ID): LoyaltySettings {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM loyalty_settings WHERE restaurant_id = ? ORDER BY id ASC LIMIT 1").get(restaurantId) as Record<string, unknown> | undefined;
  if (!row) {
    db.prepare(`
      INSERT INTO loyalty_settings (restaurant_id, points_earning_rate, points_expiration_days, points_lifetime_days, min_spend_for_visit, visit_cooldown_hours, allow_visit_table, allow_visit_counter, allow_visit_delivery)
      VALUES (?, 100.0, 90, 365, 1500.0, 18, 1, 0, 0)
    `).run(restaurantId);
    return getLoyaltySettings(restaurantId);
  }

  return {
    id: Number(row.id),
    restaurant_id: String(row.restaurant_id || restaurantId),
    points_earning_rate: Number(row.points_earning_rate),
    points_expiration_days: Number(row.points_expiration_days),
    points_lifetime_days: Number(row.points_lifetime_days || 365),
    min_spend_for_visit: Number(row.min_spend_for_visit),
    visit_cooldown_hours: Number(row.visit_cooldown_hours),
    allow_visit_table: row.allow_visit_table !== undefined ? Boolean(row.allow_visit_table) : true,
    allow_visit_counter: row.allow_visit_counter !== undefined ? Boolean(row.allow_visit_counter) : false,
    allow_visit_delivery: row.allow_visit_delivery !== undefined ? Boolean(row.allow_visit_delivery) : false,
    welcome_points_enabled: row.welcome_points_enabled !== undefined ? Boolean(row.welcome_points_enabled) : false,
    welcome_points_amount: Number(row.welcome_points_amount || 0),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

export function updateLoyaltySettings(
  settings: {
    points_earning_rate?: number;
    points_expiration_days?: number;
    points_lifetime_days?: number;
    min_spend_for_visit?: number;
    visit_cooldown_hours?: number;
    allow_visit_table?: boolean;
    allow_visit_counter?: boolean;
    allow_visit_delivery?: boolean;
    welcome_points_enabled?: boolean;
    welcome_points_amount?: number;
  },
  restaurantId: string = DEFAULT_RESTAURANT_ID
): LoyaltySettings {
  const db = getDatabase();
  const current = getLoyaltySettings(restaurantId);

  const points_earning_rate = settings.points_earning_rate ?? current.points_earning_rate;
  const points_expiration_days = settings.points_expiration_days ?? current.points_expiration_days;
  const points_lifetime_days = settings.points_lifetime_days ?? current.points_lifetime_days;
  const min_spend_for_visit = settings.min_spend_for_visit ?? current.min_spend_for_visit;
  const visit_cooldown_hours = settings.visit_cooldown_hours ?? current.visit_cooldown_hours;
  const allow_visit_table = settings.allow_visit_table !== undefined ? (settings.allow_visit_table ? 1 : 0) : (current.allow_visit_table ? 1 : 0);
  const allow_visit_counter = settings.allow_visit_counter !== undefined ? (settings.allow_visit_counter ? 1 : 0) : (current.allow_visit_counter ? 1 : 0);
  const allow_visit_delivery = settings.allow_visit_delivery !== undefined ? (settings.allow_visit_delivery ? 1 : 0) : (current.allow_visit_delivery ? 1 : 0);
  const welcome_points_enabled = settings.welcome_points_enabled !== undefined ? (settings.welcome_points_enabled ? 1 : 0) : (current.welcome_points_enabled ? 1 : 0);
  const welcome_points_amount = settings.welcome_points_amount !== undefined ? Number(settings.welcome_points_amount) : current.welcome_points_amount;

  db.prepare(`
    UPDATE loyalty_settings
    SET points_earning_rate = ?,
        points_expiration_days = ?,
        points_lifetime_days = ?,
        min_spend_for_visit = ?,
        visit_cooldown_hours = ?,
        allow_visit_table = ?,
        allow_visit_counter = ?,
        allow_visit_delivery = ?,
        welcome_points_enabled = ?,
        welcome_points_amount = ?,
        updated_at = datetime('now')
    WHERE id = ? AND restaurant_id = ?
  `).run(
    points_earning_rate,
    points_expiration_days,
    points_lifetime_days,
    min_spend_for_visit,
    visit_cooldown_hours,
    allow_visit_table,
    allow_visit_counter,
    allow_visit_delivery,
    welcome_points_enabled,
    welcome_points_amount,
    current.id,
    restaurantId
  );

  return getLoyaltySettings(restaurantId);
}

export function getActiveRewards(restaurantId: string = DEFAULT_RESTAURANT_ID): LoyaltyReward[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, restaurant_id, name, reward_type, requirement_value, is_active, description, created_at
    FROM loyalty_rewards
    WHERE is_active = 1 AND restaurant_id = ?
    ORDER BY reward_type ASC, requirement_value ASC
  `).all(restaurantId) as Array<{
    id: number;
    restaurant_id: string;
    name: string;
    reward_type: "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
    requirement_value: number;
    is_active: number;
    description: string | null;
    created_at: string;
  }>;

  return rows.map((r) => ({
    ...r,
    is_active: Boolean(r.is_active),
  }));
}

export function getAllRewards(restaurantId: string = DEFAULT_RESTAURANT_ID): LoyaltyReward[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, restaurant_id, name, reward_type, requirement_value, is_active, description, created_at
    FROM loyalty_rewards
    WHERE restaurant_id = ?
    ORDER BY is_active DESC, reward_type ASC, requirement_value ASC
  `).all(restaurantId) as Array<{
    id: number;
    restaurant_id: string;
    name: string;
    reward_type: "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
    requirement_value: number;
    is_active: number;
    description: string | null;
    created_at: string;
  }>;

  return rows.map((r) => ({
    ...r,
    is_active: Boolean(r.is_active),
  }));
}

export function getRewardById(id: number, restaurantId?: string): LoyaltyReward | null {
  const db = getDatabase();
  let r: {
    id: number;
    restaurant_id: string;
    name: string;
    reward_type: "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
    requirement_value: number;
    is_active: number;
    description: string | null;
    created_at: string;
  } | undefined;

  if (restaurantId) {
    r = db.prepare("SELECT * FROM loyalty_rewards WHERE id = ? AND restaurant_id = ?").get(id, restaurantId) as any;
  } else {
    r = db.prepare("SELECT * FROM loyalty_rewards WHERE id = ?").get(id) as any;
  }

  if (!r) return null;
  return {
    ...r,
    is_active: Boolean(r.is_active),
  };
}

export function createReward(
  data: {
    name: string;
    reward_type: "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
    requirement_value: number;
    is_active?: boolean;
    description?: string;
  },
  restaurantId: string = DEFAULT_RESTAURANT_ID
): LoyaltyReward {
  const db = getDatabase();
  const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;
  const desc = data.description ? data.description.trim() : null;

  db.prepare(`
    INSERT INTO loyalty_rewards (restaurant_id, name, reward_type, requirement_value, is_active, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(restaurantId, data.name.trim(), data.reward_type, data.requirement_value, isActive, desc);

  const lastId = (db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  return getRewardById(lastId, restaurantId)!;
}

export function updateReward(
  id: number,
  data: {
    name?: string;
    reward_type?: "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
    requirement_value?: number;
    is_active?: boolean;
    description?: string;
  },
  restaurantId?: string
): LoyaltyReward {
  const db = getDatabase();
  const current = getRewardById(id, restaurantId);
  if (!current) {
    throw new Error(`Recompensa con ID ${id} no encontrada.`);
  }

  const name = data.name !== undefined ? data.name.trim() : current.name;
  const rewardType = data.reward_type !== undefined ? data.reward_type : current.reward_type;
  const reqVal = data.requirement_value !== undefined ? data.requirement_value : current.requirement_value;
  const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active ? 1 : 0;
  const desc = data.description !== undefined ? data.description.trim() : current.description;

  db.prepare(`
    UPDATE loyalty_rewards
    SET name = ?, reward_type = ?, requirement_value = ?, is_active = ?, description = ?
    WHERE id = ?
  `).run(name, rewardType, reqVal, isActive, desc, id);

  return getRewardById(id, restaurantId)!;
}

export function toggleRewardStatus(id: number, isActive: boolean, restaurantId?: string): LoyaltyReward {
  const db = getDatabase();
  const current = getRewardById(id, restaurantId);
  if (!current) throw new Error(`Recompensa con ID ${id} no encontrada.`);

  db.prepare("UPDATE loyalty_rewards SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, id);
  const updated = getRewardById(id, restaurantId);
  return updated!;
}

export function deleteReward(id: number, restaurantId?: string): boolean {
  const db = getDatabase();
  const current = getRewardById(id, restaurantId);
  if (!current) return false;

  // Protect the special birthday reward from accidental deletion
  if (current.reward_type === "BIRTHDAY_GIFT") {
    throw new Error("No se puede eliminar la cortesía especial de cumpleaños del sistema.");
  }

  db.prepare("DELETE FROM loyalty_rewards WHERE id = ?").run(id);
  return true;
}
