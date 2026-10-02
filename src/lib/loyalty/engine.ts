import { getDatabase } from "@/lib/db/db";
import { getLoyaltySettings, getRewardById } from "@/lib/db/settings-repo";
import { findCustomerById, findCustomerByDocument, createCustomer, checkBirthdayStatus } from "@/lib/db/customer-repo";
import {
  Customer,
  LoyaltyTransactionResult,
  RedemptionResult,
  SaleSource,
  PointsHistory,
  Sale,
  PointsBatch,
  LoyaltyReward,
} from "@/types/loyalty";
import crypto from "crypto";

export interface ProcessSaleInput {
  customerId?: string;
  documentNumber?: string;
  customerName?: string;
  customerPhone?: string;
  birthDate?: string;
  totalAmount: number;
  saleDate?: string; // ISO string
  source?: SaleSource;
  saleType?: "TABLE" | "COUNTER" | "DELIVERY";
  externalSaleId?: string;
  concept?: string;
  importBatchId?: string;
}

export function processSale(input: ProcessSaleInput): LoyaltyTransactionResult {
  const db = getDatabase();
  const settings = getLoyaltySettings();

  // 1. Resolve Customer
  let customer: Customer | null = null;
  if (input.customerId) {
    customer = findCustomerById(input.customerId);
  } else if (input.documentNumber) {
    customer = findCustomerByDocument(input.documentNumber);
    if (!customer && input.customerName) {
      customer = createCustomer({
        document_number: input.documentNumber,
        name: input.customerName,
        phone: input.customerPhone,
        birth_date: input.birthDate,
      });
    }
  }

  if (!customer) {
    throw new Error("No se encontró el cliente ni se proporcionaron datos para crearlo.");
  }

  const saleDateObj = input.saleDate ? new Date(input.saleDate) : new Date();
  const saleDateStr = saleDateObj.toISOString();

  // 2. Idempotency Check on externalSaleId
  if (input.externalSaleId) {
    const existingSale = db.prepare("SELECT * FROM sales WHERE external_sale_id = ?").get(input.externalSaleId) as Sale | undefined;
    if (existingSale) {
      const history = db.prepare("SELECT * FROM points_history WHERE sale_id = ?").get(existingSale.id) as PointsHistory | undefined;
      return {
        success: true,
        customer,
        points_earned: history?.points || 0,
        visit_added: false,
        points_expire_at: customer.points_expire_at || saleDateStr,
        points_history_entry: history || {
          id: "",
          customer_id: customer.id,
          points: 0,
          concept: "Venta duplicada (Idempotencia)",
          created_at: saleDateStr,
        },
        message: "Venta previamente procesada (Idempotencia)",
      };
    }
  }

  // 3. Eje Puntos (RF-04)
  const earningRate = Math.max(1, settings.points_earning_rate);
  const pointsEarned = Math.floor(input.totalAmount / earningRate);

  // 4. Eje Visitas y Antifraude Cooldown (RF-04)
  // Regla de Negocio: Se evalúa dinámicamente según la configuración de sectores (Salón, Mostrador, Delivery) si computa visita.
  const isCounter =
    input.saleType === "COUNTER" ||
    (input.concept ? /mostrador|take\s*away|para\s*llevar/i.test(input.concept) : false);
  const isDelivery =
    input.saleType === "DELIVERY" ||
    (input.concept ? /delivery|envio/i.test(input.concept) : false);

  let sectorAllowsVisit = true;
  if (isCounter) {
    sectorAllowsVisit = Boolean(settings.allow_visit_counter);
  } else if (isDelivery) {
    sectorAllowsVisit = Boolean(settings.allow_visit_delivery);
  } else {
    sectorAllowsVisit = settings.allow_visit_table !== undefined ? Boolean(settings.allow_visit_table) : true;
  }

  let visitAdded = false;
  if (sectorAllowsVisit && input.totalAmount >= settings.min_spend_for_visit) {
    if (!customer.last_visit_at) {
      visitAdded = true;
    } else {
      const lastVisitTime = new Date(customer.last_visit_at).getTime();
      const currentSaleTime = saleDateObj.getTime();
      const diffHours = (currentSaleTime - lastVisitTime) / (1000 * 60 * 60);

      if (diffHours >= settings.visit_cooldown_hours || diffHours < 0) {
        visitAdded = true;
      }
    }
  }

  // 5. Timer 1: Inactividad Rolling a 90 días (RF-05 Revisado)
  const expirationDays = settings.points_expiration_days || 90;
  const newExpirationObj = new Date(saleDateObj.getTime() + expirationDays * 24 * 60 * 60 * 1000);
  const newExpirationStr = newExpirationObj.toISOString();

  // 6. Timer 2: Antigüedad de Lote FIFO (365 días configurable)
  const lifetimeDays = settings.points_lifetime_days || 365;
  const batchExpiresAt = new Date(saleDateObj.getTime() + lifetimeDays * 24 * 60 * 60 * 1000).toISOString();

  // 7. DB Updates in Transaction
  const saleId = crypto.randomUUID();
  const historyId = crypto.randomUUID();
  const batchId = crypto.randomUUID();
  const nowStr = new Date().toISOString();
  const source = input.source || "MANUAL";
  const conceptText = input.concept || `Consumo ${source === "MANUAL" ? "Caja" : source} ($${input.totalAmount.toLocaleString("es-AR")}) +${pointsEarned} pts`;

  db.exec("BEGIN");
  try {
    // Insert Sale
    db.prepare(`
      INSERT INTO sales (id, external_sale_id, customer_id, source, total_amount, sale_date, status, import_batch_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'CLOSED', ?, ?)
    `).run(
      saleId,
      input.externalSaleId || null,
      customer.id,
      source,
      input.totalAmount,
      saleDateStr,
      input.importBatchId || null,
      nowStr
    );

    // If points earned, create FIFO batch (Timer 2)
    if (pointsEarned > 0) {
      db.prepare(`
        INSERT INTO points_batches (id, customer_id, sale_id, points_earned, points_remaining, expires_at, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
      `).run(
        batchId,
        customer.id,
        saleId,
        pointsEarned,
        pointsEarned,
        batchExpiresAt,
        nowStr
      );
    }

    // Insert Points History
    db.prepare(`
      INSERT INTO points_history (id, customer_id, sale_id, points, concept, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      historyId,
      customer.id,
      saleId,
      pointsEarned,
      conceptText,
      nowStr
    );

    // Update Customer
    const newPointsBalance = customer.points_balance + pointsEarned;
    const newTotalSpent = customer.total_spent + input.totalAmount;
    const newVisitCount = customer.visit_count + (visitAdded ? 1 : 0);
    const newLastVisitAt = visitAdded ? saleDateStr : customer.last_visit_at;

    db.prepare(`
      UPDATE customers
      SET points_balance = ?,
          total_spent = ?,
          visit_count = ?,
          last_visit_at = ?,
          points_expire_at = ?
      WHERE id = ?
    `).run(
      newPointsBalance,
      newTotalSpent,
      newVisitCount,
      newLastVisitAt,
      newExpirationStr,
      customer.id
    );

    db.exec("COMMIT");

    const updatedCustomer = findCustomerById(customer.id)!;
    const historyEntry = db.prepare("SELECT * FROM points_history WHERE id = ?").get(historyId) as PointsHistory;
    const saleEntry = db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId) as Sale;

    return {
      success: true,
      customer: updatedCustomer,
      sale: saleEntry,
      points_earned: pointsEarned,
      visit_added: visitAdded,
      points_expire_at: newExpirationStr,
      batch_expires_at: batchExpiresAt,
      points_history_entry: historyEntry,
      message: `¡Venta registrada con éxito! Sumaste ${pointsEarned} puntos${
        visitAdded ? " y 1 visita" : !sectorAllowsVisit ? ` (${isCounter ? "mostrador" : isDelivery ? "delivery" : "salón"} no suma visita según configuración)` : ""
      }. Vencimiento rolling renovado a ${expirationDays} días. Lote FIFO activo por ${lifetimeDays} días.`,
    };
  } catch (err: unknown) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function redeemReward(customerId: string, rewardId: number): RedemptionResult {
  const db = getDatabase();
  const customer = findCustomerById(customerId);
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }

  const reward = getRewardById(rewardId);
  if (!reward) {
    throw new Error("Recompensa no encontrada.");
  }

  if (!reward.is_active) {
    throw new Error("La recompensa seleccionada no está disponible.");
  }

  const nowStr = new Date().toISOString();
  const historyId = crypto.randomUUID();

  // 1. Points-Based Reward with FIFO Consumption Algorithm
  if (reward.reward_type === "POINTS") {
    if (customer.points_balance < reward.requirement_value) {
      throw new Error(`Saldo insuficiente. Se requieren ${reward.requirement_value} puntos y el cliente tiene ${customer.points_balance} puntos.`);
    }

    db.exec("BEGIN");
    try {
      let needed = reward.requirement_value;
      const batchesConsumed: Array<{ batch_id: string; points_consumed: number }> = [];

      // Query active batches ordered FIFO by expires_at ASC
      const activeBatches = db.prepare(`
        SELECT * FROM points_batches
        WHERE customer_id = ? AND status = 'ACTIVE' AND points_remaining > 0
        ORDER BY expires_at ASC
      `).all(customer.id) as PointsBatch[];

      for (const batch of activeBatches) {
        if (needed <= 0) break;
        const deduct = Math.min(needed, batch.points_remaining);
        const newRemaining = batch.points_remaining - deduct;
        const newStatus = newRemaining === 0 ? "DEPLETED" : "ACTIVE";

        db.prepare(`
          UPDATE points_batches
          SET points_remaining = ?, status = ?
          WHERE id = ?
        `).run(newRemaining, newStatus, batch.id);

        batchesConsumed.push({ batch_id: batch.id, points_consumed: deduct });
        needed -= deduct;
      }

      const newPoints = customer.points_balance - reward.requirement_value;

      // Update customer balance
      db.prepare(`
        UPDATE customers
        SET points_balance = ?
        WHERE id = ?
      `).run(newPoints, customer.id);

      // Insert negative history
      const concept = `Canje FIFO: ${reward.name} (-${reward.requirement_value} pts)`;
      db.prepare(`
        INSERT INTO points_history (id, customer_id, points, concept, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(historyId, customer.id, -reward.requirement_value, concept, nowStr);

      db.exec("COMMIT");

      const updatedCustomer = findCustomerById(customer.id)!;
      const historyEntry = db.prepare("SELECT * FROM points_history WHERE id = ?").get(historyId) as PointsHistory;

      return {
        success: true,
        customer: updatedCustomer,
        reward,
        points_deducted: reward.requirement_value,
        points_history_entry: historyEntry,
        batches_consumed: batchesConsumed,
        message: `¡Canje FIFO exitoso de "${reward.name}"! Se debitaron ${reward.requirement_value} puntos de los lotes más antiguos.`,
      };
    } catch (err: unknown) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  // 2. Visit Milestone Reward
  if (reward.reward_type === "VISIT_MILESTONE") {
    if (customer.visit_count < reward.requirement_value) {
      throw new Error(`Visitas insuficientes. Se requieren ${reward.requirement_value} visitas (el cliente tiene ${customer.visit_count} visitas).`);
    }

    db.exec("BEGIN");
    try {
      const concept = `Canje de Hito de Visita: ${reward.name} (Alcanzó ${customer.visit_count} visitas)`;
      db.prepare(`
        INSERT INTO points_history (id, customer_id, points, concept, created_at)
        VALUES (?, ?, 0, ?, ?)
      `).run(historyId, customer.id, concept, nowStr);

      db.exec("COMMIT");

      const updatedCustomer = findCustomerById(customer.id)!;
      const historyEntry = db.prepare("SELECT * FROM points_history WHERE id = ?").get(historyId) as PointsHistory;

      return {
        success: true,
        customer: updatedCustomer,
        reward,
        points_deducted: 0,
        points_history_entry: historyEntry,
        message: `¡Beneficio por Hito de Visitas acreditado: "${reward.name}"!`,
      };
    } catch (err: unknown) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  // 3. Birthday Gift Reward
  if (reward.reward_type === "BIRTHDAY_GIFT") {
    return redeemBirthdayCourtesy(customer.id);
  }

  throw new Error("Tipo de recompensa no reconocido.");
}

export function redeemBirthdayCourtesy(customerId: string): RedemptionResult {
  const db = getDatabase();
  const customer = findCustomerById(customerId);
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }

  const bdayStatus = checkBirthdayStatus(customer);
  if (!bdayStatus.isEligible) {
    throw new Error(bdayStatus.message);
  }

  const currentYear = new Date().getFullYear();
  const nowStr = new Date().toISOString();
  const historyId = crypto.randomUUID();

  // Find or create birthday reward object
  const existingReward = db.prepare("SELECT * FROM loyalty_rewards WHERE reward_type = 'BIRTHDAY_GIFT'").get() as LoyaltyReward | undefined;
  const reward: LoyaltyReward = existingReward || {
    id: 9999,
    name: "Cortesía Anual: Postre de Cumpleaños de la Casa",
    reward_type: "BIRTHDAY_GIFT",
    requirement_value: 0,
    is_active: true,
    description: "Invitación especial por cumpleaños",
    created_at: nowStr,
  };

  db.exec("BEGIN");
  try {
    // Antifraude: save last_birthday_reward_year = currentYear
    db.prepare(`
      UPDATE customers
      SET last_birthday_reward_year = ?
      WHERE id = ?
    `).run(currentYear, customer.id);

    // Log in points_history with points = 0
    const concept = `Cortesía de cumpleaños: Postre de la casa (${currentYear})`;
    db.prepare(`
      INSERT INTO points_history (id, customer_id, points, concept, created_at)
      VALUES (?, ?, 0, ?, ?)
    `).run(historyId, customer.id, concept, nowStr);

    db.exec("COMMIT");

    const updatedCustomer = findCustomerById(customer.id)!;
    const historyEntry = db.prepare("SELECT * FROM points_history WHERE id = ?").get(historyId) as PointsHistory;

    return {
      success: true,
      customer: updatedCustomer,
      reward: { ...reward, is_active: Boolean(reward.is_active) },
      points_deducted: 0,
      points_history_entry: historyEntry,
      message: `🎂 ¡Cortesía de Cumpleaños acreditada! Entregar Postre de la Casa como agasajo de invitación a ${customer.name}.`,
    };
  } catch (err: unknown) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function runExpirationAudit(): {
  inactivityExpiredCount: number;
  inactivityPointsExpired: number;
  batchesExpiredCount: number;
  batchesPointsExpired: number;
  totalPointsExpired: number;
  day75Alerts: Customer[];
} {
  const db = getDatabase();
  const now = new Date();
  const nowStr = now.toISOString();

  let inactivityExpiredCount = 0;
  let inactivityPointsExpired = 0;
  let batchesExpiredCount = 0;
  let batchesPointsExpired = 0;

  db.exec("BEGIN");
  try {
    // 1. Timer 1: Inactivity Expiration (Rolling 90 days)
    const inactiveCustomers = db.prepare(`
      SELECT * FROM customers
      WHERE points_balance > 0 AND points_expire_at IS NOT NULL AND points_expire_at < ?
    `).all(nowStr) as Customer[];

    for (const cust of inactiveCustomers) {
      inactivityExpiredCount++;
      inactivityPointsExpired += cust.points_balance;
      const historyId = crypto.randomUUID();

      // Log in history
      db.prepare(`
        INSERT INTO points_history (id, customer_id, points, concept, created_at)
        VALUES (?, ?, ?, 'Caducidad por inactividad (+90 días)', datetime('now'))
      `).run(historyId, cust.id, -cust.points_balance);

      // Reset customer points balance to 0
      db.prepare(`
        UPDATE customers
        SET points_balance = 0
        WHERE id = ?
      `).run(cust.id);

      // Expire all active batches for this customer
      db.prepare(`
        UPDATE points_batches
        SET status = 'EXPIRED', points_remaining = 0
        WHERE customer_id = ? AND status = 'ACTIVE'
      `).run(cust.id);
    }

    // 2. Timer 2: FIFO Batches Lifetime Expiration (365 days)
    const expiredBatches = db.prepare(`
      SELECT * FROM points_batches
      WHERE status = 'ACTIVE' AND points_remaining > 0 AND expires_at < ?
    `).all(nowStr) as PointsBatch[];

    for (const batch of expiredBatches) {
      batchesExpiredCount++;
      batchesPointsExpired += batch.points_remaining;

      // Mark batch expired
      db.prepare(`
        UPDATE points_batches
        SET status = 'EXPIRED', points_remaining = 0
        WHERE id = ?
      `).run(batch.id);

      // Deduct from customer
      const cust = findCustomerById(batch.customer_id);
      if (cust && cust.points_balance > 0) {
        const deduct = Math.min(cust.points_balance, batch.points_remaining);
        db.prepare(`
          UPDATE customers
          SET points_balance = points_balance - ?
          WHERE id = ?
        `).run(deduct, cust.id);

        const historyId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO points_history (id, customer_id, points, concept, created_at)
          VALUES (?, ?, ?, 'Caducidad anual de lote (+365 días)', datetime('now'))
        `).run(historyId, cust.id, -deduct);
      }
    }

    db.exec("COMMIT");
  } catch (err: unknown) {
    db.exec("ROLLBACK");
    throw err;
  }

  // 3. Day 75 Reactivation Alert Query
  const future15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const day75Alerts = db.prepare(`
    SELECT * FROM customers
    WHERE points_balance > 0
      AND points_expire_at IS NOT NULL
      AND points_expire_at >= ?
      AND points_expire_at <= ?
    ORDER BY points_expire_at ASC
  `).all(nowStr, future15Days) as Customer[];

  return {
    inactivityExpiredCount,
    inactivityPointsExpired,
    batchesExpiredCount,
    batchesPointsExpired,
    totalPointsExpired: inactivityPointsExpired + batchesPointsExpired,
    day75Alerts,
  };
}
