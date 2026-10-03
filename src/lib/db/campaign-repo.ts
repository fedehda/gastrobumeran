import { getDatabase } from "./db";
import {
  LoyaltyCampaign,
  CreateCampaignInput,
  CampaignEvaluationResult,
  CampaignSector,
} from "@/types/loyalty";
import crypto from "node:crypto";

function mapCampaignRow(row: Record<string, unknown>): LoyaltyCampaign {
  const daysRaw = row.days_of_week;
  let days: number[] = [1, 2, 3, 4, 5, 6, 0];
  if (typeof daysRaw === "string" && daysRaw.trim().length > 0) {
    days = daysRaw.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n));
  }

  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    multiplier: Number(row.multiplier ?? 1.0),
    bonus_points: Number(row.bonus_points ?? 0),
    days_of_week: days,
    start_time: row.start_time ? String(row.start_time) : null,
    end_time: row.end_time ? String(row.end_time) : null,
    start_date: row.start_date ? String(row.start_date) : null,
    end_date: row.end_date ? String(row.end_date) : null,
    min_spend: Number(row.min_spend ?? 0),
    applicable_sectors: (row.applicable_sectors as CampaignSector) || "ALL",
    is_active: Boolean(row.is_active),
    priority: Number(row.priority ?? 1),
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

export function getAllCampaigns(): LoyaltyCampaign[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM loyalty_campaigns ORDER BY priority DESC, created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(mapCampaignRow);
}

export function getActiveCampaigns(): LoyaltyCampaign[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM loyalty_campaigns WHERE is_active = 1 ORDER BY priority DESC, created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(mapCampaignRow);
}

export function getCampaignById(id: string): LoyaltyCampaign | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM loyalty_campaigns WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapCampaignRow(row);
}

export function createCampaign(input: CreateCampaignInput): LoyaltyCampaign {
  const db = getDatabase();
  const id = `camp_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const daysStr = (input.days_of_week && input.days_of_week.length > 0)
    ? input.days_of_week.join(",")
    : "1,2,3,4,5,6,0";

  db.prepare(`
    INSERT INTO loyalty_campaigns (
      id, name, description, multiplier, bonus_points,
      days_of_week, start_time, end_time, start_date, end_date,
      min_spend, applicable_sectors, is_active, priority, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name.trim(),
    input.description?.trim() || null,
    input.multiplier !== undefined ? Number(input.multiplier) : 1.0,
    input.bonus_points !== undefined ? Number(input.bonus_points) : 0,
    daysStr,
    input.start_time || null,
    input.end_time || null,
    input.start_date || null,
    input.end_date || null,
    input.min_spend !== undefined ? Number(input.min_spend) : 0,
    input.applicable_sectors || "ALL",
    input.is_active !== undefined ? (input.is_active ? 1 : 0) : 1,
    input.priority !== undefined ? Number(input.priority) : 1,
    now,
    now
  );

  return getCampaignById(id)!;
}

export function updateCampaign(id: string, input: Partial<CreateCampaignInput>): LoyaltyCampaign {
  const db = getDatabase();
  const current = getCampaignById(id);
  if (!current) {
    throw new Error(`Campaña con ID ${id} no encontrada.`);
  }

  const name = input.name !== undefined ? input.name.trim() : current.name;
  const description = input.description !== undefined ? (input.description?.trim() || null) : current.description;
  const multiplier = input.multiplier !== undefined ? Number(input.multiplier) : current.multiplier;
  const bonus_points = input.bonus_points !== undefined ? Number(input.bonus_points) : current.bonus_points;
  const days_of_week = input.days_of_week !== undefined ? input.days_of_week.join(",") : current.days_of_week.join(",");
  const start_time = input.start_time !== undefined ? (input.start_time || null) : current.start_time;
  const end_time = input.end_time !== undefined ? (input.end_time || null) : current.end_time;
  const start_date = input.start_date !== undefined ? (input.start_date || null) : current.start_date;
  const end_date = input.end_date !== undefined ? (input.end_date || null) : current.end_date;
  const min_spend = input.min_spend !== undefined ? Number(input.min_spend) : current.min_spend;
  const applicable_sectors = input.applicable_sectors !== undefined ? input.applicable_sectors : current.applicable_sectors;
  const is_active = input.is_active !== undefined ? (input.is_active ? 1 : 0) : (current.is_active ? 1 : 0);
  const priority = input.priority !== undefined ? Number(input.priority) : current.priority;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE loyalty_campaigns
    SET name = ?, description = ?, multiplier = ?, bonus_points = ?,
        days_of_week = ?, start_time = ?, end_time = ?, start_date = ?, end_date = ?,
        min_spend = ?, applicable_sectors = ?, is_active = ?, priority = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name,
    description,
    multiplier,
    bonus_points,
    days_of_week,
    start_time,
    end_time,
    start_date,
    end_date,
    min_spend,
    applicable_sectors,
    is_active,
    priority,
    now,
    id
  );

  return getCampaignById(id)!;
}

export function toggleCampaignActive(id: string, is_active?: boolean): LoyaltyCampaign {
  const current = getCampaignById(id);
  if (!current) {
    throw new Error(`Campaña con ID ${id} no encontrada.`);
  }
  const nextState = is_active !== undefined ? is_active : !current.is_active;
  return updateCampaign(id, { is_active: nextState });
}

export function deleteCampaign(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM loyalty_campaigns WHERE id = ?").run(id);
  return res.changes > 0;
}

/**
 * Filtra las campañas activas que cumplen los criterios temporales, de importe y de sector
 */
export function findApplicableCampaigns(
  date: Date,
  amount: number,
  sector?: string
): LoyaltyCampaign[] {
  const activeCampaigns = getActiveCampaigns();
  if (activeCampaigns.length === 0) return [];

  // Local/Provided date components
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  
  // Format YYYY-MM-DD
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Format HH:mm
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  // Normalized sector
  const normSector = (sector || "TABLE").toUpperCase();

  return activeCampaigns.filter((camp) => {
    // 1. Min spend check
    if (camp.min_spend > 0 && amount < camp.min_spend) {
      return false;
    }

    // 2. Sector check
    if (camp.applicable_sectors !== "ALL" && camp.applicable_sectors !== normSector) {
      return false;
    }

    // 3. Date range check (YYYY-MM-DD)
    if (camp.start_date && dateStr < camp.start_date) {
      return false;
    }
    if (camp.end_date && dateStr > camp.end_date) {
      return false;
    }

    // 4. Day of week check
    if (camp.days_of_week.length > 0 && !camp.days_of_week.includes(dayOfWeek)) {
      return false;
    }

    // 5. Time window check (HH:mm)
    if (camp.start_time && camp.end_time) {
      if (camp.start_time <= camp.end_time) {
        // Standard window (e.g. 18:00 - 20:30)
        if (timeStr < camp.start_time || timeStr > camp.end_time) {
          return false;
        }
      } else {
        // Overnight window (e.g. 22:00 - 02:00)
        if (timeStr < camp.start_time && timeStr > camp.end_time) {
          return false;
        }
      }
    } else if (camp.start_time && timeStr < camp.start_time) {
      return false;
    } else if (camp.end_time && timeStr > camp.end_time) {
      return false;
    }

    return true;
  });
}

/**
 * Evalúa entre todas las campañas aplicables cuál otorga el mejor beneficio de puntos extra
 */
export function evaluateBestCampaign(
  date: Date,
  amount: number,
  basePoints: number,
  sector?: string
): CampaignEvaluationResult | null {
  const applicable = findApplicableCampaigns(date, amount, sector);
  if (applicable.length === 0) return null;

  let bestResult: CampaignEvaluationResult | null = null;
  let maxExtraPoints = 0;

  for (const camp of applicable) {
    const multiplierBonus = camp.multiplier > 1.0
      ? Math.floor(basePoints * (camp.multiplier - 1))
      : 0;
    const totalExtra = multiplierBonus + (camp.bonus_points > 0 ? camp.bonus_points : 0);

    if (totalExtra <= 0 && camp.multiplier <= 1.0 && camp.bonus_points <= 0) {
      continue;
    }

    if (
      bestResult === null ||
      totalExtra > maxExtraPoints ||
      (totalExtra === maxExtraPoints && camp.priority > bestResult.campaign.priority) ||
      (totalExtra === maxExtraPoints && camp.priority === bestResult.campaign.priority && camp.multiplier > bestResult.multiplier)
    ) {
      maxExtraPoints = totalExtra;
      bestResult = {
        campaign: camp,
        multiplier: camp.multiplier,
        bonusPoints: camp.bonus_points,
        extraPoints: totalExtra,
      };
    }
  }

  return bestResult;
}
