export type SaleSource = "FUDO_API" | "CSV_IMPORT" | "MANUAL" | "SELF_CLAIM";
export type RewardType = "POINTS" | "VISIT_MILESTONE" | "BIRTHDAY_GIFT";
export type BatchStatus = "ACTIVE" | "DEPLETED" | "EXPIRED";

export type RestaurantStatus = "ACTIVE" | "TRIAL_DEMO" | "SUSPENDED";

export interface Restaurant {
  id: string;
  slug: string; // url-safe e.g. "demo", "la-guitarrita"
  name: string;
  legal_name?: string | null;
  cuit?: string | null;
  status: RestaurantStatus;
  logo_url?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  timezone: string; // e.g. "America/Argentina/Buenos_Aires"
  trial_ends_at?: string | null;
  max_customers?: number;
  max_sales?: number;
  is_listed?: boolean | number;
  created_at: string;
  updated_at: string;
}

export interface ContactLead {
  id: string;
  name: string;
  restaurant_name: string;
  branch_count?: number;
  pos_system?: string | null;
  phone: string;
  email: string;
  message?: string | null;
  status: "NEW" | "CONTACTED" | "DEMO_SCHEDULED" | "CONVERTED" | "DISCARDED";
  created_at: string;
}

export interface CustomerOtpVerification {
  id: string;
  restaurant_id: string;
  identifier: string; // DNI o teléfono
  channel: "WHATSAPP" | "SMS";
  otp_code: string;
  attempts: number;
  is_verified: boolean | number;
  expires_at: string;
  created_at: string;
}

export interface Customer {
  id: string;
  restaurant_id?: string;
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
  restaurant_id?: string;
  external_sale_id?: string | null;
  customer_id?: string | null;
  source: SaleSource;
  total_amount: number;
  sale_date: string;
  status: string;
  visit_added?: boolean;
  campaign_id?: string | null;
  campaign_multiplier?: number;
  campaign_bonus_points?: number;
  import_batch_id?: string | null;
  claimed_at?: string | null;
  claimed_by_customer_id?: string | null;
  created_at: string;
}

export interface PointsBatch {
  id: string;
  restaurant_id?: string;
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
  restaurant_id?: string;
  customer_id: string;
  sale_id?: string | null;
  points: number; // positive = earned, negative = redeemed/expired, 0 = birthday courtesy
  concept: string;
  campaign_id?: string | null;
  created_at: string;
}

export interface LoyaltySettings {
  id: number;
  restaurant_id?: string;
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
  is_sandbox?: boolean; // Modo demo / sandbox activo (desactiva cooldown antifraude para testing en esta build)
  updated_at: string;
}

export interface LoyaltyReward {
  id: number;
  restaurant_id?: string;
  name: string;
  reward_type: RewardType;
  requirement_value: number; // e.g. 350 pts or Visit #5, 0 for birthday gift
  is_active: boolean;
  description?: string | null;
  created_at: string;
}

export type CampaignSector = "ALL" | "TABLE" | "COUNTER" | "DELIVERY";

export interface LoyaltyCampaign {
  id: string;
  restaurant_id?: string;
  name: string;
  description?: string | null;
  multiplier: number; // e.g. 1.5, 2.0, 3.0
  bonus_points: number; // fixed bonus points (e.g. +50 pts)
  days_of_week: number[]; // [0, 1, 2, 3, 4, 5, 6] (0 = Sunday, 1 = Monday, etc.)
  start_time?: string | null; // "18:00"
  end_time?: string | null; // "20:00"
  start_date?: string | null; // "YYYY-MM-DD"
  end_date?: string | null; // "YYYY-MM-DD"
  min_spend: number;
  applicable_sectors: CampaignSector; // "ALL" | "TABLE" | "COUNTER" | "DELIVERY"
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignInput {
  name: string;
  restaurant_id?: string;
  description?: string | null;
  multiplier?: number;
  bonus_points?: number;
  days_of_week?: number[];
  start_time?: string | null;
  end_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  min_spend?: number;
  applicable_sectors?: CampaignSector;
  is_active?: boolean;
  priority?: number;
}

export interface CampaignEvaluationResult {
  campaign: LoyaltyCampaign;
  multiplier: number;
  bonusPoints: number;
  extraPoints: number; // total bonus points credited on top of base points
}

export interface CsvMappingPreset {
  id: number;
  restaurant_id?: string | null;
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
  restaurant_id?: string;
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
  base_points?: number;
  campaign_bonus_points?: number;
  applied_campaign?: {
    id: string;
    name: string;
    multiplier: number;
    bonus_points: number;
  } | null;
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
  restaurant_id?: string | null;
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

export type AdminRole = "OWNER" | "ADMIN" | "CASHIER" | "SUPERVISOR" | "OPERATOR" | "PLATFORM_ADMIN";

export interface AdminUser {
  id: string;
  restaurant_id?: string | null;
  restaurant_name?: string | null;
  restaurant_slug?: string | null;
  name: string;
  email: string;
  role: AdminRole;
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
  active_campaigns?: LoyaltyCampaign[];
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
