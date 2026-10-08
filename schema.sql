-- GASTROBUMERAN - PostgreSQL 14+ DDL Schema Multi-Tenant
-- Compatible con PostgreSQL 14+ / Supabase / Neon / AWS RDS

-- 0. Restaurantes y Comercios Gastronómicos
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    legal_name VARCHAR(150),
    cuit VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'TRIAL_DEMO', 'SUSPENDED'
    logo_url TEXT,
    primary_color VARCHAR(10) DEFAULT '#f59e0b',
    accent_color VARCHAR(10) DEFAULT '#d97706',
    address VARCHAR(200),
    city VARCHAR(100),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    instagram VARCHAR(60),
    timezone VARCHAR(60) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    max_customers INT DEFAULT 50,
    max_sales INT DEFAULT 100,
    is_listed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);

-- 1. Clientes y Balances por Restaurante
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    fudo_customer_id VARCHAR(64),
    document_number VARCHAR(20) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(120),
    name VARCHAR(120) NOT NULL,
    birth_date DATE,
    last_birthday_reward_year INT DEFAULT NULL,
    points_balance INT NOT NULL DEFAULT 0,
    total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
    visit_count INT NOT NULL DEFAULT 0,
    last_visit_at TIMESTAMP WITH TIME ZONE,
    points_expire_at TIMESTAMP WITH TIME ZONE,
    loyalty_enrolled BOOLEAN NOT NULL DEFAULT TRUE,
    welcome_points_awarded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_customers_restaurant_doc UNIQUE (restaurant_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_customers_resto_doc ON customers(restaurant_id, document_number);
CREATE INDEX IF NOT EXISTS idx_customers_resto_phone ON customers(restaurant_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_resto_name ON customers(restaurant_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_resto_fudo ON customers(restaurant_id, fudo_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_resto_exp ON customers(restaurant_id, points_expire_at) WHERE points_balance > 0;
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers (restaurant_id, EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date));

-- 2. Registro Transaccional de Ventas por Restaurante
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    external_sale_id VARCHAR(64),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    source VARCHAR(20) NOT NULL, -- 'FUDO_API', 'CSV_IMPORT', 'MANUAL', 'SELF_CLAIM'
    total_amount NUMERIC(12,2) NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CLOSED',
    visit_added BOOLEAN NOT NULL DEFAULT FALSE,
    campaign_id VARCHAR(64),
    campaign_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    campaign_bonus_points INT NOT NULL DEFAULT 0,
    import_batch_id UUID,
    claimed_at TIMESTAMP WITH TIME ZONE,
    claimed_by_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_sales_restaurant_ext UNIQUE (restaurant_id, external_sale_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_resto_cust ON sales(restaurant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_resto_date ON sales(restaurant_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_resto_ext ON sales(restaurant_id, external_sale_id);

-- 3. Control de Lotes FIFO por Restaurante (Timer 2)
CREATE TABLE IF NOT EXISTS points_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    points_earned INT NOT NULL,
    points_remaining INT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'DEPLETED', 'EXPIRED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_resto_fifo ON points_batches(restaurant_id, customer_id, expires_at) WHERE status = 'ACTIVE';

-- 4. Bitácora de Auditoría de Puntos
CREATE TABLE IF NOT EXISTS points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    points INT NOT NULL,
    concept VARCHAR(150) NOT NULL,
    campaign_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_history_resto_cust ON points_history(restaurant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_points_history_resto_created ON points_history(restaurant_id, created_at);

-- 5. Parámetros de Fidelización por Restaurante
CREATE TABLE IF NOT EXISTS loyalty_settings (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID UNIQUE NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    points_earning_rate NUMERIC(10,2) NOT NULL DEFAULT 100.0,
    points_expiration_days INT NOT NULL DEFAULT 90,
    points_lifetime_days INT NOT NULL DEFAULT 365,
    min_spend_for_visit NUMERIC(10,2) NOT NULL DEFAULT 1500.0,
    visit_cooldown_hours INT NOT NULL DEFAULT 18,
    allow_visit_table BOOLEAN NOT NULL DEFAULT TRUE,
    allow_visit_counter BOOLEAN NOT NULL DEFAULT FALSE,
    allow_visit_delivery BOOLEAN NOT NULL DEFAULT FALSE,
    welcome_points_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    welcome_points_amount INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Configuración de API Pública de Fudo POS por Restaurante
CREATE TABLE IF NOT EXISTS fudo_config (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID UNIQUE NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    api_key VARCHAR(255) NOT NULL DEFAULT '',
    api_secret VARCHAR(255) NOT NULL DEFAULT '',
    base_url VARCHAR(255) NOT NULL DEFAULT 'https://api.fu.do/v1alpha1',
    auth_url VARCHAR(255) NOT NULL DEFAULT 'https://auth.fu.do/api',
    bearer_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    sync_interval_minutes INT NOT NULL DEFAULT 60,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Catálogo de Premios y Beneficios por Restaurante
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    reward_type VARCHAR(20) NOT NULL, -- 'POINTS', 'VISIT_MILESTONE', 'BIRTHDAY_GIFT'
    requirement_value INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_resto ON loyalty_rewards(restaurant_id, is_active);

-- 8. Motor de Campañas Dinámicas por Restaurante
CREATE TABLE IF NOT EXISTS loyalty_campaigns (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    multiplier NUMERIC(4,2) NOT NULL DEFAULT 2.0,
    bonus_points INT NOT NULL DEFAULT 0,
    days_of_week VARCHAR(30) NOT NULL DEFAULT '1,2,3,4,5,6,0',
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    start_date DATE,
    end_date DATE,
    min_spend NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    applicable_sectors VARCHAR(20) NOT NULL DEFAULT 'ALL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_resto ON loyalty_campaigns(restaurant_id, is_active);

-- 9. Presets de Mapeo CSV (Globales o Propios del Restaurante)
CREATE TABLE IF NOT EXISTS csv_mapping_presets (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE, -- NULL = preset global del sistema
    system_name VARCHAR(50) NOT NULL UNIQUE,
    mapping_config JSONB NOT NULL,
    delimiter VARCHAR(5) DEFAULT ';',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Bitácora de Tareas Programadas / Cron Jobs
CREATE TABLE IF NOT EXISTS cron_logs (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    job_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'ERROR', 'WARNING'
    summary TEXT NOT NULL,
    details_json JSONB,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_resto ON cron_logs(restaurant_id, executed_at);

-- 11. Usuarios Administradores & Control de Acceso (RBAC)
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE, -- NULL = PLATFORM_ADMIN
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ADMIN', -- 'OWNER', 'ADMIN', 'CASHIER', 'SUPERVISOR', 'PLATFORM_ADMIN'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_resto ON admin_users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- 12. Tokens de Verificación de Email de Restaurantes
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token VARCHAR(64) PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    email VARCHAR(150) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Verificaciones OTP de Comensales (WhatsApp / SMS)
CREATE TABLE IF NOT EXISTS customer_otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    identifier VARCHAR(30) NOT NULL,
    channel VARCHAR(10) NOT NULL DEFAULT 'WHATSAPP',
    otp_code VARCHAR(10) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_lookup ON customer_otp_verifications(restaurant_id, identifier, otp_code);

-- 14. Contact Leads de la Landing Pública
CREATE TABLE IF NOT EXISTS contact_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    restaurant_name VARCHAR(120) NOT NULL,
    branch_count INT DEFAULT 1,
    pos_system VARCHAR(60),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(120) NOT NULL,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
