-- GASTROBUMERAN - PostgreSQL DDL Schema (Consolidado con Fudo API)
-- Compatible con PostgreSQL 14+ / Supabase / Neon / AWS RDS

-- 1. Clientes y Balances
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fudo_customer_id VARCHAR(64) UNIQUE,
    document_number VARCHAR(20) UNIQUE NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(120),
    name VARCHAR(120) NOT NULL,
    birth_date DATE,                                -- Fecha de cumpleaños para cortesía anual
    last_birthday_reward_year INT DEFAULT NULL,     -- Antifraude: año del último postre canjeado
    points_balance INT NOT NULL DEFAULT 0,
    total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
    visit_count INT NOT NULL DEFAULT 0,
    last_visit_at TIMESTAMP WITH TIME ZONE,
    points_expire_at TIMESTAMP WITH TIME ZONE,      -- Timer 1: Inactividad rolling (90 días)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_doc ON customers(document_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_fudo ON customers(fudo_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_expiration ON customers(points_expire_at) WHERE points_balance > 0;
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers (EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date));

-- 2. Registro Transaccional de Ventas (Fudo / CSV / Manual / Auto-Acreditación)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_sale_id VARCHAR(64) UNIQUE, -- ID en Fudo, Maxirest o código único
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    source VARCHAR(20) NOT NULL,         -- 'FUDO_API', 'CSV_IMPORT', 'MANUAL', 'SELF_CLAIM'
    total_amount NUMERIC(12,2) NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CLOSED',
    import_batch_id UUID,                -- Para tracking de lotes CSV
    claimed_at TIMESTAMP WITH TIME ZONE, -- Fecha en que el cliente auto-acreditó su ticket
    claimed_by_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_external ON sales(external_sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_claimed ON sales(claimed_by_customer_id);

-- 3. Control de Lotes FIFO para Caducidad Anual (Timer 2 - 365 días)
CREATE TABLE IF NOT EXISTS points_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    points_earned INT NOT NULL,
    points_remaining INT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,    -- Timer 2: Antigüedad de lote fija
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',   -- 'ACTIVE', 'DEPLETED', 'EXPIRED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_fifo ON points_batches(customer_id, expires_at) WHERE status = 'ACTIVE';

-- 4. Bitácora de Auditoría de Puntos (Doble Partida)
CREATE TABLE IF NOT EXISTS points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    points INT NOT NULL,                 -- Positivo (suma), Negativo (canje/caducidad) o 0 (cortesía cumpleaños)
    concept VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_history_customer ON points_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created ON points_history(created_at);

-- 5. Parámetros Globales de Fidelización (Backoffice)
CREATE TABLE IF NOT EXISTS loyalty_settings (
    id SERIAL PRIMARY KEY,
    points_earning_rate NUMERIC(10,2) NOT NULL DEFAULT 100.0, -- $ por cada punto
    points_expiration_days INT NOT NULL DEFAULT 90,           -- Timer 1: Inactividad rolling
    points_lifetime_days INT NOT NULL DEFAULT 365,            -- Timer 2: Vencimiento máx. FIFO
    min_spend_for_visit NUMERIC(10,2) NOT NULL DEFAULT 1500.0,-- Monto mín. para visita
    visit_cooldown_hours INT NOT NULL DEFAULT 18,              -- Horas antifraude de visita
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Configuración de API Pública de Fudo (RF-01)
CREATE TABLE IF NOT EXISTS fudo_config (
    id SERIAL PRIMARY KEY,
    api_key VARCHAR(120),
    api_secret VARCHAR(120),
    base_url VARCHAR(150) DEFAULT 'https://api.fu.do/v1alpha1',
    bearer_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    auto_sync_enabled BOOLEAN DEFAULT TRUE,
    sync_interval_minutes INT DEFAULT 15,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Catálogo de Premios y Beneficios
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    reward_type VARCHAR(20) NOT NULL,   -- 'POINTS', 'VISIT_MILESTONE', 'BIRTHDAY_GIFT'
    requirement_value INT NOT NULL,     -- Ej: 350 pts, Visita #5, o 0 para cortesía
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Presets de Mapeo CSV para Sistemas Externos
CREATE TABLE IF NOT EXISTS csv_mapping_presets (
    id SERIAL PRIMARY KEY,
    system_name VARCHAR(50) NOT NULL UNIQUE, -- Ej: 'Maxirest', 'Tango'
    mapping_config JSONB NOT NULL,           -- Configuración serializada de columnas
    delimiter VARCHAR(5) DEFAULT ';',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Configuración de Conexión a Fudo API Pública (RF-01)
CREATE TABLE IF NOT EXISTS fudo_config (
    id SERIAL PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL DEFAULT '',
    api_secret VARCHAR(255) NOT NULL DEFAULT '',
    base_url VARCHAR(255) NOT NULL DEFAULT 'https://api.fu.do/v1alpha1',
    bearer_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    sync_interval_minutes INT NOT NULL DEFAULT 60,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Bitácora de Tareas Programadas / Cron Jobs (Sprint 4)
CREATE TABLE IF NOT EXISTS cron_logs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(50) NOT NULL,          -- 'EXPIRATION_AUDIT', 'FUDO_AUTO_SYNC'
    status VARCHAR(20) NOT NULL,            -- 'SUCCESS', 'ERROR', 'WARNING'
    summary TEXT NOT NULL,
    details_json JSONB,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INT NOT NULL DEFAULT 0
);

-- 11. Usuarios Administradores & Control de Acceso (Sprint 5)
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_job ON cron_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed ON cron_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_sales_external_id ON sales(external_sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_fudo_id ON customers(fudo_customer_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

