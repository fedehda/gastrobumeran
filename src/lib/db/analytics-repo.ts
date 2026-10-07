import { getDatabase } from "./db";
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

export function getBackofficeAnalytics(timeRange?: "7d" | "30d" | "90d" | "all"): BackofficeAnalytics {
  const db = getDatabase();
  const settings = getLoyaltySettings();

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
  `).get() as {
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
    WHERE status = 'CLOSED' ${dateFilter}
  `).get() as { total_sales: number; total_revenue: number };

  const pointsStats = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) as total_issued,
      COALESCE(ABS(SUM(CASE WHEN points < 0 AND concept LIKE 'Canje:%' THEN points ELSE 0 END)), 0) as total_redeemed,
      COALESCE(ABS(SUM(CASE WHEN points < 0 AND (concept LIKE '%Caducidad%' OR concept LIKE '%Inactividad%' OR concept LIKE '%Lote%') THEN points ELSE 0 END)), 0) as total_expired
    FROM points_history
  `).get() as { total_issued: number; total_redeemed: number; total_expired: number };

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
    WHERE status = 'CLOSED' ${dateFilter}
    GROUP BY source
  `).all() as Array<{ source: string; sales_count: number; total_revenue: number }>;

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

  // 3. Cohort Distribution
  const rawCohorts = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN visit_count = 1 THEN 1 ELSE 0 END), 0) as new_count,
      COALESCE(SUM(CASE WHEN visit_count >= 2 AND visit_count <= 4 THEN 1 ELSE 0 END), 0) as occasional_count,
      COALESCE(SUM(CASE WHEN visit_count >= 5 AND visit_count <= 9 THEN 1 ELSE 0 END), 0) as frequent_count,
      COALESCE(SUM(CASE WHEN visit_count >= 10 THEN 1 ELSE 0 END), 0) as vip_count
    FROM customers
  `).get() as {
    new_count: number;
    occasional_count: number;
    frequent_count: number;
    vip_count: number;
  };

  const cohorts: CohortDistribution = {
    newCount: rawCohorts.new_count,
    occasionalCount: rawCohorts.occasional_count,
    frequentCount: rawCohorts.frequent_count,
    vipCount: rawCohorts.vip_count,
    totalCustomers,
    retentionRatePercent,
  };

  // 4. Top 10 Most Valuable Customers
  const topCustomers = db.prepare(`
    SELECT
      id,
      name,
      document_number,
      phone,
      total_spent,
      visit_count,
      points_balance,
      last_visit_at,
      points_expire_at
    FROM customers
    ORDER BY total_spent DESC, visit_count DESC
    LIMIT 10
  `).all() as CustomerValueRank[];

  // 5. Ranking of Rewards
  const rawRewards = db.prepare(`
    SELECT
      r.id,
      r.name,
      r.reward_type,
      COUNT(ph.id) as redemption_count,
      COALESCE(ABS(SUM(ph.points)), 0) as total_points_spent
    FROM loyalty_rewards r
    LEFT JOIN points_history ph ON ph.concept LIKE 'Canje: ' || r.name || '%'
    GROUP BY r.id, r.name, r.reward_type
    ORDER BY redemption_count DESC, total_points_spent DESC
  `).all() as Array<{
    id: number;
    name: string;
    reward_type: string;
    redemption_count: number;
    total_points_spent: number;
  }>;

  const topRewards: RewardPopularity[] = rawRewards.map((r) => ({
    id: r.id,
    name: r.name,
    reward_type: r.reward_type as RewardPopularity["reward_type"],
    redemptionCount: r.redemption_count,
    totalPointsSpent: r.total_points_spent,
  }));

  // 6. Churn Risk & Day 75 Anti-Inflation Alerts
  const risk15Days = db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(points_balance), 0) as points
    FROM customers
    WHERE points_balance > 0
      AND datetime(points_expire_at) >= datetime('now')
      AND datetime(points_expire_at) <= datetime('now', '+15 days')
  `).get() as { count: number; points: number };

  const risk30Days = db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(points_balance), 0) as points
    FROM customers
    WHERE points_balance > 0
      AND datetime(points_expire_at) >= datetime('now')
      AND datetime(points_expire_at) <= datetime('now', '+30 days')
  `).get() as { count: number; points: number };

  const atRiskCustomers = db.prepare(`
    SELECT
      id,
      name,
      document_number,
      phone,
      total_spent,
      visit_count,
      points_balance,
      last_visit_at,
      points_expire_at
    FROM customers
    WHERE points_balance > 0
      AND datetime(points_expire_at) >= datetime('now')
      AND datetime(points_expire_at) <= datetime('now', '+15 days')
    ORDER BY points_balance DESC
    LIMIT 10
  `).all() as CustomerValueRank[];

  // 7. Recent Crons
  const recentCrons = getCronLogs(10);

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
      expiring15DaysCount: risk15Days.count,
      expiring15DaysPoints: risk15Days.points,
      expiring30DaysCount: risk30Days.count,
      expiring30DaysPoints: risk30Days.points,
      atRiskCustomers,
    },
    recentCrons,
  };
}

export function getRfmSegmentationReport(cmvPercentage = 32): RfmSegmentationReport {
  const db = getDatabase();
  const now = new Date();

  // 1. Fetch all customers
  const customersRows = db.prepare(`
    SELECT
      id,
      name,
      document_number,
      phone,
      email,
      points_balance,
      total_spent,
      visit_count,
      last_visit_at,
      created_at
    FROM customers
    ORDER BY total_spent DESC, visit_count DESC
  `).all() as Array<{
    id: string;
    name: string;
    document_number: string;
    phone: string | null;
    email: string | null;
    points_balance: number;
    total_spent: number;
    visit_count: number;
    last_visit_at: string | null;
    created_at: string;
  }>;

  const totalAnalyzed = customersRows.length;
  const rfmCustomers: RfmCustomer[] = [];

  const quadrantCounts: Record<RfmQuadrant, {
    count: number;
    revenue: number;
    points: number;
  }> = {
    CHAMPIONS: { count: 0, revenue: 0, points: 0 },
    PROMISING: { count: 0, revenue: 0, points: 0 },
    AT_RISK: { count: 0, revenue: 0, points: 0 },
    DORMANT: { count: 0, revenue: 0, points: 0 },
  };

  let totalActivePoints = 0;

  for (const c of customersRows) {
    const points = c.points_balance || 0;
    const frequency = c.visit_count || 0;
    const monetary = c.total_spent || 0;
    totalActivePoints += points;

    // Compute recency in days
    let recencyDays = 999;
    if (c.last_visit_at) {
      const visitDate = new Date(c.last_visit_at);
      recencyDays = Math.max(0, Math.floor((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24)));
    } else if (c.created_at) {
      const createdDate = new Date(c.created_at);
      recencyDays = Math.max(0, Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    let quadrant: RfmQuadrant = "DORMANT";
    let quadrantLabel = "Dormidos";
    let badgeColor = "bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40";
    let recommendation = "Inactivos (+90 días). Enviar promo de reactivación agresiva (2x1 o invitación especial).";
    let whatsappMessage = `¡Hola ${c.name}! 🔁 Hace tiempo no te vemos por GastroBumeran. Te extrañamos: presentá este mensaje esta semana y disfrutá de una consumición de cortesía.`;

    if (recencyDays <= 45 && frequency >= 4) {
      quadrant = "CHAMPIONS";
      quadrantLabel = "Champions (VIPs)";
      badgeColor = "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40";
      recommendation = "Clientes más leales y rentables. Fidelizar con atención preferencial y degustaciones sorpresa sin desgastar con promociones de descuento.";
      whatsappMessage = `¡Hola ${c.name}! 🌟 Como uno de nuestros comensales más destacados en GastroBumeran, tenés ${points} puntos acumulados para canjear cuando quieras. ¡Te esperamos pronto!`;
    } else if (recencyDays <= 45) {
      quadrant = "PROMISING";
      quadrantLabel = "Prometedores";
      badgeColor = "bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/40";
      recommendation = "Visitaron recientemente con frecuencia en crecimiento. Incentivar una visita más para convertirlos en Champions.";
      whatsappMessage = `¡Hola ${c.name}! 🍔 Te esperamos nuevamente en GastroBumeran para seguir sumando sellos de visita y acumular puntos en tu tarjeta digital.`;
    } else if (recencyDays <= 90 && (frequency >= 2 || monetary >= 5000)) {
      quadrant = "AT_RISK";
      quadrantLabel = "En Riesgo (Rescate)";
      badgeColor = "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40";
      recommendation = "Eran comensales habituales pero no vienen hace 45-90 días. Sus puntos están cerca de la caducidad. Enviar rescate de WhatsApp.";
      whatsappMessage = `¡Hola ${c.name}! ⏰ Notamos que hace unos días no nos visitás. Te recordamos que tenés ${points} puntos activos en tu cuenta y nos encantaría recibirte antes de que caduquen.`;
    } else {
      quadrant = "DORMANT";
      quadrantLabel = "Dormidos";
      badgeColor = "bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40";
      recommendation = "Inactivos (+90 días o 1 sola visita lejana). Lanzar campaña de reactivación agresiva.";
      whatsappMessage = `¡Hola ${c.name}! 🔁 Hace tiempo no te vemos por GastroBumeran. Volvé esta semana y te agasajamos con un beneficio especial de bienvenida.`;
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

  // 3. Compute Floating Points Liability (Pasivo Contable Flotante)
  const pointsStats = db.prepare(`
    SELECT
      COALESCE(ABS(SUM(CASE WHEN points < 0 AND (concept LIKE '%Caducidad%' OR concept LIKE '%Inactividad%' OR concept LIKE '%Lote%') THEN points ELSE 0 END)), 0) as total_expired
    FROM points_history
  `).get() as { total_expired: number };

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

