export type SaleSource = "FUDO_API" | "CSV_IMPORT" | "MANUAL" | "SELF_CLAIM";
export type RewardType = "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
export type BatchStatus = "ACTIVE" | "DEPLETED" | "EXPIRED";

export interface Customer {
  id: string;
  fudo_customer_id?: string | null;
  document_number: string;
  phone?: string | null;
  email?: string | null;
  name: string;
  birth_date?: string | null; // YYYY-MM-DD
  last_birthday_reward_year?: number | null;
  points_balance: number;
  total_spent: number;
  visit_count: number;
  last_visit_at?: string | null;
  points_expire_at?: string | null; // Timer 1: Inactivity (90 days)
  loyalty_enrolled?: boolean | number; // 1 = participating, 0 = not enrolled / ignored in points
  welcome_points_awarded?: boolean | number; // 1 = already received welcome bonus, 0 = not yet
  created_at: string;
}

export interface Sale {
  id: string;
  external_sale_id?: string | null;
  customer_id?: string | null;
  source: SaleSource;
  total_amount: number;
  sale_date: string;
  status: string;
  visit_added?: boolean;
  import_batch_id?: string | null;
  claimed_at?: string | null;
  claimed_by_customer_id?: string | null;
  created_at: string;
}

export interface PointsBatch {
  id: string;
  customer_id: string;
  sale_id?: string | null;
  points_earned: number;
  points_remaining: number;
  expires_at: string; // Timer 2: FIFO fixed expiration (365 days)
  status: BatchStatus;
  created_at: string;
}

export interface PointsHistory {
  id: string;
  customer_id: string;
  sale_id?: string | null;
  points: number; // positive = earned, negative = redeemed/expired, 0 = birthday courtesy
  concept: string;
  created_at: string;
}

export interface LoyaltySettings {
  id: number;
  points_earning_rate: number; // e.g. 100 => 1 point per $100 spent
  points_expiration_days: number; // Timer 1: Inactivity rolling window (default 90 days)
  points_lifetime_days: number; // Timer 2: FIFO batch maximum lifetime (default 365 days)
  min_spend_for_visit: number; // minimum amount to count as visit, e.g. $1500
  visit_cooldown_hours: number; // anti-fraud cooldown between counted visits, default 18h
  allow_visit_table: boolean; // ¿Mesa / Salón suma visita? Default: true
  allow_visit_counter: boolean; // ¿Mostrador / Take Away suma visita? Default: false
  allow_visit_delivery: boolean; // ¿Delivery suma visita? Default: false
  welcome_points_enabled?: boolean; // ¿Otorgar puntos de bienvenida al registrarse / afiliarse? Default: false
  welcome_points_amount?: number; // Cantidad de puntos de bienvenida (ej. 50, 100)
  updated_at: string;
}

export interface LoyaltyReward {
  id: number;
  name: string;
  reward_type: RewardType;
  requirement_value: number; // e.g. 350 pts or Visit #5, 0 for birthday gift
  is_active: boolean;
  description?: string | null;
  created_at: string;
}

export interface CsvMappingPreset {
  id: number;
  system_name: string;
  mapping_config: {
    document_number?: string;
    name?: string;
    total_amount?: string;
    sale_date?: string;
    phone?: string;
    external_sale_id?: string;
  };
  delimiter: string;
  created_at: string;
}

export interface FudoConfig {
  id: number;
  api_key: string;
  api_secret: string;
  base_url: string;
  auth_url?: string;
  bearer_token?: string | null;
  token_expires_at?: string | null;
  last_sync_at?: string | null;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  updated_at: string;
}

export interface FudoCustomer {
  id: string;
  name: string;
  fiscalNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
}

export interface FudoSale {
  id: string;
  total: number;
  createdAt: string;
  status: "CLOSED" | "OPEN" | "CANCELED";
  type: "TABLE" | "COUNTER" | "DELIVERY";
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerDocument?: string | null;
}

export interface FudoSyncResult {
  totalRetrieved: number;
  syncedCount: number;
  duplicatedCount: number;
  canceledCount?: number;
  unassignedCount: number;
  newCustomersCount: number;
  importedCustomersCount?: number;
  updatedCustomersCount?: number;
  totalPointsEarned: number;
  totalAmountProcessed: number;
  errors: string[];
  lastSyncAt: string;
}

export interface LoyaltyTransactionResult {
  success: boolean;
  customer: Customer;
  sale?: Sale;
  points_earned: number;
  visit_added: boolean;
  points_expire_at?: string | null;
  batch_expires_at?: string;
  points_history_entry: PointsHistory;
  message?: string;
}

export interface CancelSaleResult {
  success: boolean;
  sale: Sale;
  customer?: Customer | null;
  points_deducted: number;
  visit_deducted: boolean;
  message: string;
}

export interface RedemptionResult {
  success: boolean;
  customer: Customer;
  reward: LoyaltyReward;
  points_deducted: number;
  points_history_entry: PointsHistory;
  message: string;
  batches_consumed?: Array<{ batch_id: string; points_consumed: number }>;
}

export interface BirthdayStatus {
  isEligible: boolean;
  daysDiff: number;
  message: string;
  alreadyClaimedThisYear: boolean;
}

export interface CronLog {
  id: number;
  job_name: string;
  status: "SUCCESS" | "ERROR" | "WARNING";
  summary: string;
  details_json?: string | null;
  executed_at: string;
  duration_ms: number;
}

export interface IngestionChannelStats {
  source: SaleSource;
  label: string;
  salesCount: number;
  totalRevenue: number;
  totalPoints: number;
  percentageRevenue: number;
}

export interface CohortDistribution {
  newCount: number; // 1 visita
  occasionalCount: number; // 2-4 visitas
  frequentCount: number; // 5-9 visitas
  vipCount: number; // 10+ visitas
  totalCustomers: number;
  retentionRatePercent: number;
}

export interface CustomerValueRank {
  id: string;
  name: string;
  document_number: string;
  phone?: string | null;
  total_spent: number;
  visit_count: number;
  points_balance: number;
  last_visit_at?: string | null;
  points_expire_at?: string | null;
}

export interface RewardPopularity {
  id: number;
  name: string;
  reward_type: RewardType;
  redemptionCount: number;
  totalPointsSpent: number;
}

export interface BackofficeAnalytics {
  kpis: {
    totalCustomers: number;
    activeCustomersCount: number;
    retentionRatePercent: number;
    totalRevenue: number;
    averageTicket: number;
    totalPointsIssued: number;
    totalPointsRedeemed: number;
    pointsRedemptionRatePercent: number;
    currentActivePointsLiability: number;
    antiInflationSavingsPoints: number;
    antiInflationSavingsEstimatedArs: number;
  };
  ingestionChannels: IngestionChannelStats[];
  cohorts: CohortDistribution;
  topCustomers: CustomerValueRank[];
  topRewards: RewardPopularity[];
  churnRisk: {
    expiring15DaysCount: number;
    expiring15DaysPoints: number;
    expiring30DaysCount: number;
    expiring30DaysPoints: number;
    atRiskCustomers: CustomerValueRank[];
  };
  recentCrons: CronLog[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CASHIER" | "SUPERVISOR";
  created_at: string;
}

export interface AuthSession {
  user: AdminUser;
  token: string;
  expiresAt: string;
}

export interface CustomerTier {
  name: string; // "Bronce" | "Plata" | "Oro" | "VIP Black"
  level: number; // 1 to 4
  badge_color: string;
  gradient_class: string;
  next_tier_name?: string | null;
  visits_needed_for_next: number;
  progress_percent: number;
}

export interface PortalRewardProgress {
  reward: LoyaltyReward;
  is_redeemable: boolean;
  progress_percent: number;
  points_needed: number;
  visits_needed: number;
}

export interface CustomerPortalCard {
  customer: Customer;
  tier: CustomerTier;
  birthday_status: BirthdayStatus;
  days_until_inactivity_expiry: number | null;
  is_expiring_soon: boolean;
  next_expiring_batch: {
    points: number;
    expires_at: string;
    days_left: number;
  } | null;
  rewards_progress: PortalRewardProgress[];
  recent_history: PointsHistory[];
  qr_payload: string;
}

export type RfmQuadrant = "CHAMPIONS" | "PROMISING" | "AT_RISK" | "DORMANT";

export interface RfmCustomer {
  customer_id: string;
  name: string;
  document_number: string;
  phone?: string | null;
  email?: string | null;
  recency_days: number;
  frequency_visits: number;
  monetary_spent: number;
  points_balance: number;
  quadrant: RfmQuadrant;
  quadrant_label: string;
  badge_color: string;
  actionable_recommendation: string;
  whatsapp_suggested_message: string;
}

export interface RfmQuadrantStats {
  quadrant: RfmQuadrant;
  label: string;
  description: string;
  badge_color: string;
  gradient_class: string;
  customer_count: number;
  percentage_of_total: number;
  total_revenue: number;
  total_active_points: number;
  strategy_recommendation: string;
}

export interface FloatingPointsLiability {
  total_active_points: number;
  nominal_catalog_value_ars: number;
  cmv_percentage: number; // default 32%
  real_cost_liability_ars: number;
  extinguished_anti_inflation_points: number;
  extinguished_anti_inflation_ars: number;
  liability_revenue_ratio_percent: number;
  health_status: "HEALTHY" | "MODERATE" | "HIGH";
  health_label: string;
}

export interface RfmSegmentationReport {
  generated_at: string;
  total_analyzed_customers: number;
  quadrants: Record<RfmQuadrant, RfmQuadrantStats>;
  customers: RfmCustomer[];
  liability: FloatingPointsLiability;
}
