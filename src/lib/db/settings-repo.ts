import { getDatabase } from "./db";
import { LoyaltySettings, LoyaltyReward } from "@/types/loyalty";

export function getLoyaltySettings(): LoyaltySettings {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM loyalty_settings ORDER BY id ASC LIMIT 1").get() as LoyaltySettings;
  if (!row) {
    db.prepare(`
      INSERT INTO loyalty_settings (points_earning_rate, points_expiration_days, points_lifetime_days, min_spend_for_visit, visit_cooldown_hours)
      VALUES (100.0, 90, 365, 1500.0, 18)
    `).run();
    return db.prepare("SELECT * FROM loyalty_settings ORDER BY id ASC LIMIT 1").get() as LoyaltySettings;
  }
  return row;
}

export function updateLoyaltySettings(settings: {
  points_earning_rate?: number;
  points_expiration_days?: number;
  points_lifetime_days?: number;
  min_spend_for_visit?: number;
  visit_cooldown_hours?: number;
}): LoyaltySettings {
  const db = getDatabase();
  const current = getLoyaltySettings();

  const points_earning_rate = settings.points_earning_rate ?? current.points_earning_rate;
  const points_expiration_days = settings.points_expiration_days ?? current.points_expiration_days;
  const points_lifetime_days = settings.points_lifetime_days ?? current.points_lifetime_days;
  const min_spend_for_visit = settings.min_spend_for_visit ?? current.min_spend_for_visit;
  const visit_cooldown_hours = settings.visit_cooldown_hours ?? current.visit_cooldown_hours;

  db.prepare(`
    UPDATE loyalty_settings
    SET points_earning_rate = ?,
        points_expiration_days = ?,
        points_lifetime_days = ?,
        min_spend_for_visit = ?,
        visit_cooldown_hours = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(points_earning_rate, points_expiration_days, points_lifetime_days, min_spend_for_visit, visit_cooldown_hours, current.id);

  return getLoyaltySettings();
}

export function getActiveRewards(): LoyaltyReward[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, name, reward_type, requirement_value, is_active, description, created_at
    FROM loyalty_rewards
    WHERE is_active = 1
    ORDER BY reward_type ASC, requirement_value ASC
  `).all() as Array<{
    id: number;
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

export function getAllRewards(): LoyaltyReward[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, name, reward_type, requirement_value, is_active, description, created_at
    FROM loyalty_rewards
    ORDER BY is_active DESC, reward_type ASC, requirement_value ASC
  `).all() as Array<{
    id: number;
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

export function getRewardById(id: number): LoyaltyReward | null {
  const db = getDatabase();
  const r = db.prepare("SELECT * FROM loyalty_rewards WHERE id = ?").get(id) as
    | {
        id: number;
        name: string;
        reward_type: "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
        requirement_value: number;
        is_active: number;
        description: string | null;
        created_at: string;
      }
    | undefined;

  if (!r) return null;
  return {
    ...r,
    is_active: Boolean(r.is_active),
  };
}

export function createReward(data: {
  name: string;
  reward_type: "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
  requirement_value: number;
  is_active?: boolean;
  description?: string;
}): LoyaltyReward {
  const db = getDatabase();
  const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;
  const desc = data.description ? data.description.trim() : null;

  db.prepare(`
    INSERT INTO loyalty_rewards (name, reward_type, requirement_value, is_active, description, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(data.name.trim(), data.reward_type, data.requirement_value, isActive, desc);

  const lastId = (db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  return getRewardById(lastId)!;
}

export function updateReward(
  id: number,
  data: {
    name?: string;
    reward_type?: "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
    requirement_value?: number;
    is_active?: boolean;
    description?: string;
  }
): LoyaltyReward {
  const db = getDatabase();
  const current = getRewardById(id);
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

  return getRewardById(id)!;
}

export function toggleRewardStatus(id: number, isActive: boolean): LoyaltyReward {
  const db = getDatabase();
  db.prepare("UPDATE loyalty_rewards SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, id);
  const updated = getRewardById(id);
  if (!updated) throw new Error(`Recompensa con ID ${id} no encontrada.`);
  return updated;
}

export function deleteReward(id: number): boolean {
  const db = getDatabase();
  const current = getRewardById(id);
  if (!current) return false;

  // Protect the special birthday reward from accidental deletion (can still be edited)
  if (current.reward_type === "BIRTHDAY_GIFT") {
    throw new Error("No se puede eliminar la cortesía especial de cumpleaños del sistema.");
  }

  db.prepare("DELETE FROM loyalty_rewards WHERE id = ?").run(id);
  return true;
}
