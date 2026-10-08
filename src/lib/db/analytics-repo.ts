import { getDatabase, DEFAULT_RESTAURANT_ID } from "./db";
import { getLoyaltySettings } from "./settings-repo";
import { getCronLogs } from "./cron-repo";
import {
  BackofficeAnalytics,
  IngestionChannelStats,
  CohortDistribution,
  CustomerValueRank,
  RewardPopularity,
  SaleSource,
  RfmQuadrant,
  RfmCustomer,
  RfmQuadrantStats,
  FloatingPointsLiability,
  RfmSegmentationReport,
} from "@/types/loyalty";

export function getBackofficeAnalytics(
  timeRange?: "7d" | "30d" | "90d" | "all",
  restaurantId: string = DEFAULT_RESTAURANT_ID
): BackofficeAnalytics {
  const db = getDatabase();
  const settings = getLoyaltySettings(restaurantId);

  // Time filter condition for time-sensitive aggregates
  let dateFilter = "";
  if (timeRange === "7d") {
    dateFilter = "AND datetime(sale_date) >= datetime('now', '-7 days')";
  } else if (timeRange === "30d") {
    dateFilter = "AND datetime(sale_date) >= datetime('now', '-30 days')";
  } else if (timeRange === "90d") {
    dateFilter = "AND datetime(sale_date) >= datetime('now', '-90 days')";
  }

  // 1. Core KPIs
  const customerStats = db.prepare(`
    SELECT
      COUNT(*) as total_customers,
      COALESCE(SUM(points_balance), 0) as total_active_points,
      COALESCE(SUM(CASE WHEN visit_count >= 2 THEN 1 ELSE 0 END), 0) as recurring_customers,
      COALESCE(SUM(CASE WHEN datetime(last_visit_at) >= datetime('now', '-90 days') THEN 1 ELSE 0 END), 0) as active_90d_customers
    FROM customers
    WHERE restaurant_id = ?
  `).get(restaurantId) as {
    total_customers: number;
    total_active_points: number;
    recurring_customers: number;
    active_90d_customers: number;
  };

  const salesStats = db.prepare(`
    SELECT
      COUNT(*) as total_sales,
      COALESCE(SUM(total_amount), 0) as total_revenue
    FROM sales
    WHERE restaurant_id = ? AND status = 'CLOSED' ${dateFilter}
  `).get(restaurantId) as { total_sales: number; total_revenue: number };

  const pointsStats = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) as total_issued,
      COALESCE(ABS(SUM(CASE WHEN points < 0 AND concept LIKE 'Canje:%' THEN points ELSE 0 END)), 0) as total_redeemed,
      COALESCE(ABS(SUM(CASE WHEN points < 0 AND (concept LIKE '%Caducidad%' OR concept LIKE '%Inactividad%' OR concept LIKE '%Lote%') THEN points ELSE 0 END)), 0) as total_expired
    FROM points_history
    WHERE restaurant_id = ?
  `).get(restaurantId) as { total_issued: number; total_redeemed: number; total_expired: number };

  const totalCustomers = customerStats.total_customers;
  const recurringCustomers = customerStats.recurring_customers;
  const retentionRatePercent = totalCustomers > 0 ? Math.round((recurringCustomers / totalCustomers) * 1000) / 10 : 0;
  const averageTicket = salesStats.total_sales > 0 ? Math.round(salesStats.total_revenue / salesStats.total_sales) : 0;
  const redemptionRatePercent = pointsStats.total_issued > 0
    ? Math.round((pointsStats.total_redeemed / pointsStats.total_issued) * 1000) / 10
    : 0;

  // Anti-Inflation savings: expired points value in ARS equivalent
  const antiInflationSavingsPoints = pointsStats.total_expired;
  const antiInflationSavingsEstimatedArs = antiInflationSavingsPoints * settings.points_earning_rate;

  // 2. Ingestion Channels Stats
  const rawChannels = db.prepare(`
    SELECT
      source,
      COUNT(*) as sales_count,
      COALESCE(SUM(total_amount), 0) as total_revenue
    FROM sales
    WHERE restaurant_id = ? AND status = 'CLOSED' ${dateFilter}
    GROUP BY source
  `).all(restaurantId) as Array<{ source: string; sales_count: number; total_revenue: number }>;

  const totalFilteredRevenue = salesStats.total_revenue || 1;
  const channelLabels: Record<string, string> = {
    FUDO_API: "API Pública Fudo POS",
    CSV_IMPORT: "Importador Universal CSV",
    MANUAL: "Caja / Punto de Venta Manual",
    SELF_CLAIM: "Auto-Acreditación Web / QR",
  };

  const channelMap = new Map(rawChannels.map((c) => [c.source, c]));
  const standardSources: SaleSource[] = ["FUDO_API", "CSV_IMPORT", "MANUAL"];

  const ingestionChannels: IngestionChannelStats[] = standardSources.map((src) => {
    const record = channelMap.get(src);
    const rev = record?.total_revenue || 0;
    const count = record?.sales_count || 0;
    const pointsEstimate = Math.floor(rev / settings.points_earning_rate);
    const pct = Math.round((rev / totalFilteredRevenue) * 1000) / 10;

    return {
      source: src,
      label: channelLabels[src] || src,
      salesCount: count,
      totalRevenue: rev,
      totalPoints: pointsEstimate,
      percentageRevenue: pct,
    };
  });

  // 3. Cohort Distribution (Frequency Pyramid)
  const cohortRows = db.prepare(`
    SELECT
      SUM(CASE WHEN visit_count = 1 THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN visit_count >= 2 AND visit_count <= 4 THEN 1 ELSE 0 END) as occasional_count,
      SUM(CASE WHEN visit_count >= 5 AND visit_count <= 9 THEN 1 ELSE 0 END) as frequent_count,
      SUM(CASE WHEN visit_count >= 10 THEN 1 ELSE 0 END) as vip_count
    FROM customers
    WHERE restaurant_id = ?
  `).get(restaurantId) as {
    new_count: number;
    occasional_count: number;
    frequent_count: number;
    vip_count: number;
  };

  const cohorts: CohortDistribution = {
    newCount: cohortRows.new_count || 0,
    occasionalCount: cohortRows.occasional_count || 0,
    frequentCount: cohortRows.frequent_count || 0,
    vipCount: cohortRows.vip_count || 0,
    totalCustomers,
    retentionRatePercent,
  };

  // 4. Top 10 Valuable Customers
  const topCustomers = db.prepare(`
    SELECT id, name, document_number, phone, total_spent, visit_count, points_balance, last_visit_at, points_expire_at
    FROM customers
    WHERE restaurant_id = ?
    ORDER BY total_spent DESC, visit_count DESC
    LIMIT 10
  `).all(restaurantId) as CustomerValueRank[];

  // 5. Top 5 Redeemed Rewards
  const topRewardsRaw = db.prepare(`
    SELECT
      r.id,
      r.name,
      r.reward_type,
      COUNT(ph.id) as redemption_count,
      COALESCE(ABS(SUM(ph.points)), 0) as total_points_spent
    FROM loyalty_rewards r
    LEFT JOIN points_history ph ON ph.concept LIKE 'Canje% ' || r.name || '%' AND ph.restaurant_id = r.restaurant_id
    WHERE r.restaurant_id = ?
    GROUP BY r.id, r.name, r.reward_type
    ORDER BY redemption_count DESC, total_points_spent DESC
    LIMIT 5
  `).all(restaurantId) as Array<{
    id: number;
    name: string;
    reward_type: "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
    redemption_count: number;
    total_points_spent: number;
  }>;

  const topRewards: RewardPopularity[] = topRewardsRaw.map((tr) => ({
    id: tr.id,
    name: tr.name,
    reward_type: tr.reward_type,
    redemptionCount: tr.redemption_count,
    totalPointsSpent: tr.total_points_spent,
  }));

  // 6. Churn Risk & Day 75 Alerts (Inactivity expiration in 15 or 30 days)
  const expiring15 = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(points_balance), 0) as points
    FROM customers
    WHERE restaurant_id = ?
      AND points_balance > 0
      AND points_expire_at IS NOT NULL
      AND datetime(points_expire_at) >= datetime('now')
      AND datetime(points_expire_at) <= datetime('now', '+15 days')
  `).get(restaurantId) as { count: number; points: number };

  const expiring30 = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(points_balance), 0) as points
    FROM customers
    WHERE restaurant_id = ?
      AND points_balance > 0
      AND points_expire_at IS NOT NULL
      AND datetime(points_expire_at) >= datetime('now')
      AND datetime(points_expire_at) <= datetime('now', '+30 days')
  `).get(restaurantId) as { count: number; points: number };

  const atRiskCustomers = db.prepare(`
    SELECT id, name, document_number, phone, total_spent, visit_count, points_balance, last_visit_at, points_expire_at
    FROM customers
    WHERE restaurant_id = ?
      AND points_balance > 0
      AND points_expire_at IS NOT NULL
      AND datetime(points_expire_at) >= datetime('now')
      AND datetime(points_expire_at) <= datetime('now', '+30 days')
    ORDER BY points_expire_at ASC
    LIMIT 10
  `).all(restaurantId) as CustomerValueRank[];

  // 7. Recent Cron Logs for this restaurant
  const recentCrons = getCronLogs(10, restaurantId);

  return {
    kpis: {
      totalCustomers,
      activeCustomersCount: customerStats.active_90d_customers,
      retentionRatePercent,
      totalRevenue: salesStats.total_revenue,
      averageTicket,
      totalPointsIssued: pointsStats.total_issued,
      totalPointsRedeemed: pointsStats.total_redeemed,
      pointsRedemptionRatePercent: redemptionRatePercent,
      currentActivePointsLiability: customerStats.total_active_points,
      antiInflationSavingsPoints,
      antiInflationSavingsEstimatedArs,
    },
    ingestionChannels,
    cohorts,
    topCustomers,
    topRewards,
    churnRisk: {
      expiring15DaysCount: expiring15.count,
      expiring15DaysPoints: expiring15.points,
      expiring30DaysCount: expiring30.count,
      expiring30DaysPoints: expiring30.points,
      atRiskCustomers,
    },
    recentCrons,
  };
}

export function getRfmSegmentation(
  restaurantId: string = DEFAULT_RESTAURANT_ID,
  cmvPercentage = 32
): RfmSegmentationReport {
  const db = getDatabase();
  const now = new Date();

  // 1. Fetch all customers for this restaurant
  const customers = db.prepare(`
    SELECT id, name, document_number, phone, email, total_spent, visit_count, points_balance, last_visit_at
    FROM customers
    WHERE restaurant_id = ?
    ORDER BY total_spent DESC
  `).all(restaurantId) as Array<{
    id: string;
    name: string;
    document_number: string;
    phone: string | null;
    email: string | null;
    total_spent: number;
    visit_count: number;
    points_balance: number;
    last_visit_at: string | null;
  }>;

  const totalAnalyzed = customers.length;
  let totalActivePoints = 0;

  const quadrantCounts: Record<RfmQuadrant, { count: number; revenue: number; points: number }> = {
    CHAMPIONS: { count: 0, revenue: 0, points: 0 },
    PROMISING: { count: 0, revenue: 0, points: 0 },
    AT_RISK: { count: 0, revenue: 0, points: 0 },
    DORMANT: { count: 0, revenue: 0, points: 0 },
  };

  const rfmCustomers: RfmCustomer[] = [];

  for (const c of customers) {
    const monetary = c.total_spent || 0;
    const frequency = c.visit_count || 0;
    const points = c.points_balance || 0;
    totalActivePoints += points;

    let recencyDays = 999;
    if (c.last_visit_at) {
      const visitDate = new Date(c.last_visit_at);
      const diffMs = now.getTime() - visitDate.getTime();
      recencyDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    let quadrant: RfmQuadrant = "DORMANT";
    let quadrantLabel = "Dormidos";
    let badgeColor = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40";
    let recommendation = "Campaña de reactivación agresiva (2x1, copa de bienvenida) o depuración de base.";
    let whatsappMessage = `¡Hola ${c.name}! Hace tiempo que no te vemos por nuestro salón. Te invitamos con un 2x1 en tu próxima visita. ¡Te esperamos!`;

    if (recencyDays <= 45 && frequency >= 4) {
      quadrant = "CHAMPIONS";
      quadrantLabel = "Champions (VIPs)";
      badgeColor = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40";
      recommendation = "Cuidado VIP, degustaciones de cocina, acceso prioritario y eventos exclusivos.";
      whatsappMessage = `¡Hola ${c.name}! Gracias por ser uno de nuestros comensales más queridos. En tu próxima visita pedí una degustación especial de la casa de cortesía.`;
    } else if (recencyDays <= 45 && frequency < 4) {
      quadrant = "PROMISING";
      quadrantLabel = "Prometedores";
      badgeColor = "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/40";
      recommendation = "Doble puntaje en próxima visita, gamificación de sellos y encuestas post-consumo.";
      whatsappMessage = `¡Hola ${c.name}! Nos encanta tenerte con nosotros. Esta semana tenés doble puntaje en todos tus consumos de salón. ¡Aprovechalo!`;
    } else if (recencyDays > 45 && recencyDays <= 90) {
      quadrant = "AT_RISK";
      quadrantLabel = "En Riesgo (Rescate)";
      badgeColor = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40";
      recommendation = "Alerta de Día 75 pre-vencimiento por WhatsApp y propuesta gastronómica atractiva.";
      whatsappMessage = `¡Hola ${c.name}! Tenés ${points} puntos acumulados que están próximos a vencer si no registrás una visita. ¡Vení a disfrutarlos antes de que expiren!`;
    } else {
      quadrant = "DORMANT";
      quadrantLabel = "Dormidos";
      badgeColor = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40";
      recommendation = "Campaña de reactivación agresiva (2x1, copa de bienvenida) o depuración de base.";
      whatsappMessage = `¡Hola ${c.name}! Te extrañamos en el restaurante. Si venís este mes te invitamos un postre o trago de cortesía. ¡Esperamos verte pronto!`;
    }

    quadrantCounts[quadrant].count++;
    quadrantCounts[quadrant].revenue += monetary;
    quadrantCounts[quadrant].points += points;

    rfmCustomers.push({
      customer_id: c.id,
      name: c.name,
      document_number: c.document_number,
      phone: c.phone,
      email: c.email,
      recency_days: recencyDays,
      frequency_visits: frequency,
      monetary_spent: monetary,
      points_balance: points,
      quadrant,
      quadrant_label: quadrantLabel,
      badge_color: badgeColor,
      actionable_recommendation: recommendation,
      whatsapp_suggested_message: whatsappMessage,
    });
  }

  // 2. Assemble Quadrant Stats
  const totalRev = Object.values(quadrantCounts).reduce((acc, q) => acc + q.revenue, 0);

  const quadrantsStats: Record<RfmQuadrant, RfmQuadrantStats> = {
    CHAMPIONS: {
      quadrant: "CHAMPIONS",
      label: "Champions (VIPs)",
      description: "Asistieron recientemente, visitan con alta frecuencia y generan el mayor ticket.",
      badge_color: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40",
      gradient_class: "from-emerald-950/60 via-dark-900 to-dark-950 border-emerald-500/40",
      customer_count: quadrantCounts.CHAMPIONS.count,
      percentage_of_total: totalAnalyzed > 0 ? Math.round((quadrantCounts.CHAMPIONS.count / totalAnalyzed) * 1000) / 10 : 0,
      total_revenue: quadrantCounts.CHAMPIONS.revenue,
      total_active_points: quadrantCounts.CHAMPIONS.points,
      strategy_recommendation: "Cuidado VIP, degustaciones de cocina, acceso prioritario y eventos exclusivos.",
    },
    PROMISING: {
      quadrant: "PROMISING",
      label: "Prometedores",
      description: "Comensales recientes con potencial de convertirse en embajadores habituales.",
      badge_color: "bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/40",
      gradient_class: "from-sky-950/60 via-dark-900 to-dark-950 border-sky-500/40",
      customer_count: quadrantCounts.PROMISING.count,
      percentage_of_total: totalAnalyzed > 0 ? Math.round((quadrantCounts.PROMISING.count / totalAnalyzed) * 1000) / 10 : 0,
      total_revenue: quadrantCounts.PROMISING.revenue,
      total_active_points: quadrantCounts.PROMISING.points,
      strategy_recommendation: "Doble puntaje en próxima visita, gamificación de sellos y encuestas post-consumo.",
    },
    AT_RISK: {
      quadrant: "AT_RISK",
      label: "En Riesgo (Rescate)",
      description: "Eran clientes leales pero no asisten hace 45-90 días. En zona crítica de caducidad.",
      badge_color: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40",
      gradient_class: "from-amber-950/60 via-dark-900 to-dark-950 border-amber-500/40",
      customer_count: quadrantCounts.AT_RISK.count,
      percentage_of_total: totalAnalyzed > 0 ? Math.round((quadrantCounts.AT_RISK.count / totalAnalyzed) * 1000) / 10 : 0,
      total_revenue: quadrantCounts.AT_RISK.revenue,
      total_active_points: quadrantCounts.AT_RISK.points,
      strategy_recommendation: "Alerta de Día 75 pre-vencimiento por WhatsApp y propuesta gastronómica atractiva.",
    },
    DORMANT: {
      quadrant: "DORMANT",
      label: "Dormidos",
      description: "Superaron los 90 días de inactividad o asistieron una sola vez sin retorno.",
      badge_color: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40",
      gradient_class: "from-rose-950/60 via-dark-900 to-dark-950 border-rose-500/40",
      customer_count: quadrantCounts.DORMANT.count,
      percentage_of_total: totalAnalyzed > 0 ? Math.round((quadrantCounts.DORMANT.count / totalAnalyzed) * 1000) / 10 : 0,
      total_revenue: quadrantCounts.DORMANT.revenue,
      total_active_points: quadrantCounts.DORMANT.points,
      strategy_recommendation: "Campañas de reactivación agresivas (2x1, copa de bienvenida) o depuración de base.",
    },
  };

  // 3. Compute Floating Points Liability (Pasivo Contable Flotante) for this restaurant
  const pointsStats = db.prepare(`
    SELECT
      COALESCE(ABS(SUM(CASE WHEN points < 0 AND (concept LIKE '%Caducidad%' OR concept LIKE '%Inactividad%' OR concept LIKE '%Lote%') THEN points ELSE 0 END)), 0) as total_expired
    FROM points_history
    WHERE restaurant_id = ?
  `).get(restaurantId) as { total_expired: number };

  const catalogValuePerPoint = 10;
  const nominalValueArs = totalActivePoints * catalogValuePerPoint;
  const realCostLiabilityArs = Math.round(nominalValueArs * (cmvPercentage / 100));

  const extinguishedPoints = pointsStats.total_expired;
  const extinguishedArs = Math.round(extinguishedPoints * catalogValuePerPoint * (cmvPercentage / 100));

  const liabilityRatio = totalRev > 0 ? Math.round((realCostLiabilityArs / totalRev) * 1000) / 10 : 0;

  let healthStatus: "HEALTHY" | "MODERATE" | "HIGH" = "HEALTHY";
  let healthLabel = "Salud Financiera Óptima (Pasivo < 4% de la facturación)";
  if (liabilityRatio >= 8) {
    healthStatus = "HIGH";
    healthLabel = "Pasivo Elevado (> 8% de facturación) - Revisar costos de premios";
  } else if (liabilityRatio >= 4) {
    healthStatus = "MODERATE";
    healthLabel = "Pasivo Moderado (4% - 8% de facturación) - Monitorear canjes";
  }

  const liability: FloatingPointsLiability = {
    total_active_points: totalActivePoints,
    nominal_catalog_value_ars: nominalValueArs,
    cmv_percentage: cmvPercentage,
    real_cost_liability_ars: realCostLiabilityArs,
    extinguished_anti_inflation_points: extinguishedPoints,
    extinguished_anti_inflation_ars: extinguishedArs,
    liability_revenue_ratio_percent: liabilityRatio,
    health_status: healthStatus,
    health_label: healthLabel,
  };

  return {
    generated_at: now.toISOString(),
    total_analyzed_customers: totalAnalyzed,
    quadrants: quadrantsStats,
    customers: rfmCustomers,
    liability,
  };
}

export function generateRfmCsv(customers: RfmCustomer[]): string {
  // UTF-8 BOM so Excel opens accents cleanly
  const bom = "\uFEFF";
  const headers = [
    "Nombre",
    "DNI",
    "Telefono",
    "Email",
    "Cuadrante_RFM",
    "Recencia_Dias",
    "Visitas",
    "Gasto_Total_ARS",
    "Puntos_Activos",
    "Recomendacion_Marketing",
  ];

  const escapeField = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = customers.map((c) => [
    escapeField(c.name),
    escapeField(c.document_number),
    escapeField(c.phone || ""),
    escapeField(c.email || ""),
    escapeField(c.quadrant_label),
    c.recency_days,
    c.frequency_visits,
    c.monetary_spent,
    c.points_balance,
    escapeField(c.actionable_recommendation),
  ].join(";"));

  return bom + [headers.join(";"), ...rows].join("\r\n");
}
