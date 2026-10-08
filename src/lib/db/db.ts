import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "gastrobumeran.sqlite");

export const DEFAULT_RESTAURANT_ID = "resto-demo-default";
export const DEFAULT_RESTAURANT_SLUG = "demo";

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initDatabase(dbInstance);
  }
  return dbInstance;
}

function safeAddColumn(db: DatabaseSync, table: string, columnDef: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`);
  } catch {
    // Column might already exist, safe to ignore
  }
}

function tableExists(db: DatabaseSync, tableName: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  return Boolean(row);
}

function tableHasColumn(db: DatabaseSync, tableName: string, columnName: string): boolean {
  if (!tableExists(db, tableName)) return false;
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === columnName);
}

function initDatabase(db: DatabaseSync) {
  db.exec("PRAGMA busy_timeout = 10000;");
  try {
    db.exec("PRAGMA journal_mode = WAL;");
  } catch {
    // Safe to ignore if WAL is already active or connection is temporarily busy
  }
  db.exec("PRAGMA foreign_keys = OFF;");

  // 1. Create Restaurants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      legal_name TEXT,
      cuit TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      logo_url TEXT,
      primary_color TEXT DEFAULT '#f59e0b',
      accent_color TEXT DEFAULT '#d97706',
      address TEXT,
      city TEXT,
      phone TEXT,
      whatsapp TEXT,
      instagram TEXT,
      timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
      trial_ends_at TEXT,
      max_customers INTEGER DEFAULT 50,
      max_sales INTEGER DEFAULT 100,
      is_listed INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
    CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
  `);

  // Ensure default seed restaurant exists
  db.prepare(`
    INSERT OR IGNORE INTO restaurants (
      id, slug, name, legal_name, cuit, status, logo_url,
      primary_color, accent_color, address, city, phone, whatsapp, is_listed
    ) VALUES (
      ?, 'demo', 'GastroBumeran Demo Resto', 'GastroBumeran SAS', '30-11223344-5',
      'ACTIVE', '/gastro-icon.svg', '#f59e0b', '#d97706',
      'Av. Corrientes 1234', 'CABA', '+54 11 4444-5555', '+54 9 11 4444-5555', 1
    )
  `).run(DEFAULT_RESTAURANT_ID);

  // 2. Multi-tenant migration for CUSTOMERS table
  if (tableExists(db, "customers") && !tableHasColumn(db, "customers", "restaurant_id")) {
    db.exec(`
      CREATE TABLE customers_mtenant_tmp (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
        fudo_customer_id TEXT,
        document_number TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        name TEXT NOT NULL,
        birth_date TEXT,
        last_birthday_reward_year INTEGER,
        points_balance INTEGER NOT NULL DEFAULT 0,
        total_spent REAL NOT NULL DEFAULT 0.0,
        visit_count INTEGER NOT NULL DEFAULT 0,
        last_visit_at TEXT,
        points_expire_at TEXT,
        loyalty_enrolled INTEGER NOT NULL DEFAULT 1,
        welcome_points_awarded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        UNIQUE(restaurant_id, document_number)
      );

      INSERT INTO customers_mtenant_tmp (
        id, restaurant_id, fudo_customer_id, document_number, phone, email, name,
        birth_date, last_birthday_reward_year, points_balance, total_spent,
        visit_count, last_visit_at, points_expire_at, loyalty_enrolled,
        welcome_points_awarded, created_at
      )
      SELECT
        id, '${DEFAULT_RESTAURANT_ID}', fudo_customer_id, document_number, phone, email, name,
        birth_date, last_birthday_reward_year, points_balance, total_spent,
        visit_count, last_visit_at, points_expire_at, loyalty_enrolled,
        welcome_points_awarded, created_at
      FROM customers;

      DROP TABLE customers;
      ALTER TABLE customers_mtenant_tmp RENAME TO customers;
    `);
  } else if (!tableExists(db, "customers")) {
    db.exec(`
      CREATE TABLE customers (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
        fudo_customer_id TEXT,
        document_number TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        name TEXT NOT NULL,
        birth_date TEXT,
        last_birthday_reward_year INTEGER,
        points_balance INTEGER NOT NULL DEFAULT 0,
        total_spent REAL NOT NULL DEFAULT 0.0,
        visit_count INTEGER NOT NULL DEFAULT 0,
        last_visit_at TEXT,
        points_expire_at TEXT,
        loyalty_enrolled INTEGER NOT NULL DEFAULT 1,
        welcome_points_awarded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        UNIQUE(restaurant_id, document_number)
      );
    `);
  }

  // 3. Multi-tenant migration for SALES table
  if (tableExists(db, "sales") && !tableHasColumn(db, "sales", "restaurant_id")) {
    db.exec(`
      CREATE TABLE sales_mtenant_tmp (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
        external_sale_id TEXT,
        customer_id TEXT,
        source TEXT NOT NULL,
        total_amount REAL NOT NULL,
        sale_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CLOSED',
        visit_added INTEGER NOT NULL DEFAULT 0,
        campaign_id TEXT,
        campaign_multiplier REAL NOT NULL DEFAULT 1.0,
        campaign_bonus_points INTEGER NOT NULL DEFAULT 0,
        import_batch_id TEXT,
        claimed_at TEXT,
        claimed_by_customer_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        UNIQUE(restaurant_id, external_sale_id)
      );

      INSERT INTO sales_mtenant_tmp (
        id, restaurant_id, external_sale_id, customer_id, source, total_amount,
        sale_date, status, visit_added, campaign_id, campaign_multiplier,
        campaign_bonus_points, import_batch_id, claimed_at, claimed_by_customer_id, created_at
      )
      SELECT
        id, '${DEFAULT_RESTAURANT_ID}', external_sale_id, customer_id, source, total_amount,
        sale_date, status, visit_added, campaign_id, campaign_multiplier,
        campaign_bonus_points, import_batch_id, claimed_at, claimed_by_customer_id, created_at
      FROM sales;

      DROP TABLE sales;
      ALTER TABLE sales_mtenant_tmp RENAME TO sales;
    `);
  } else if (!tableExists(db, "sales")) {
    db.exec(`
      CREATE TABLE sales (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
        external_sale_id TEXT,
        customer_id TEXT,
        source TEXT NOT NULL,
        total_amount REAL NOT NULL,
        sale_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CLOSED',
        visit_added INTEGER NOT NULL DEFAULT 0,
        campaign_id TEXT,
        campaign_multiplier REAL NOT NULL DEFAULT 1.0,
        campaign_bonus_points INTEGER NOT NULL DEFAULT 0,
        import_batch_id TEXT,
        claimed_at TEXT,
        claimed_by_customer_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        UNIQUE(restaurant_id, external_sale_id)
      );
    `);
  }

  // 4. Points Batches & History
  db.exec(`
    CREATE TABLE IF NOT EXISTS points_batches (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
      customer_id TEXT NOT NULL,
      sale_id TEXT,
      points_earned INTEGER NOT NULL,
      points_remaining INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS points_history (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
      customer_id TEXT NOT NULL,
      sale_id TEXT,
      points INTEGER NOT NULL,
      concept TEXT NOT NULL,
      campaign_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE SET NULL
    );
  `);

  safeAddColumn(db, "points_batches", `restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}'`);
  safeAddColumn(db, "points_history", `restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}'`);

  // 5. Loyalty Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
      points_earning_rate REAL NOT NULL DEFAULT 100.0,
      points_expiration_days INTEGER NOT NULL DEFAULT 90,
      points_lifetime_days INTEGER NOT NULL DEFAULT 365,
      min_spend_for_visit REAL NOT NULL DEFAULT 1500.0,
      visit_cooldown_hours INTEGER NOT NULL DEFAULT 18,
      allow_visit_table INTEGER NOT NULL DEFAULT 1,
      allow_visit_counter INTEGER NOT NULL DEFAULT 0,
      allow_visit_delivery INTEGER NOT NULL DEFAULT 0,
      welcome_points_enabled INTEGER NOT NULL DEFAULT 0,
      welcome_points_amount INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      UNIQUE(restaurant_id)
    );
  `);
  safeAddColumn(db, "loyalty_settings", `restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}'`);

  // 6. Loyalty Rewards
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
      name TEXT NOT NULL,
      reward_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);
  safeAddColumn(db, "loyalty_rewards", `restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}'`);

  // 7. CSV Mapping Presets
  db.exec(`
    CREATE TABLE IF NOT EXISTS csv_mapping_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT,
      system_name TEXT NOT NULL UNIQUE,
      mapping_config TEXT NOT NULL,
      delimiter TEXT DEFAULT ';',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);
  safeAddColumn(db, "csv_mapping_presets", "restaurant_id TEXT");

  // 8. Fudo Config
  db.exec(`
    CREATE TABLE IF NOT EXISTS fudo_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
      api_key TEXT NOT NULL DEFAULT '',
      api_secret TEXT NOT NULL DEFAULT '',
      base_url TEXT NOT NULL DEFAULT 'https://api.fu.do/v1alpha1',
      auth_url TEXT NOT NULL DEFAULT 'https://auth.fu.do/api',
      bearer_token TEXT,
      token_expires_at TEXT,
      last_sync_at TEXT,
      auto_sync_enabled INTEGER NOT NULL DEFAULT 0,
      sync_interval_minutes INTEGER NOT NULL DEFAULT 60,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      UNIQUE(restaurant_id)
    );
  `);
  safeAddColumn(db, "fudo_config", `restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}'`);

  // 9. Cron Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT,
      job_name TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      details_json TEXT,
      executed_at TEXT DEFAULT (datetime('now')),
      duration_ms INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);
  safeAddColumn(db, "cron_logs", "restaurant_id TEXT");

  // 10. Admin Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ADMIN',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);
  safeAddColumn(db, "admin_users", `restaurant_id TEXT DEFAULT '${DEFAULT_RESTAURANT_ID}'`);

  // 11. Auth Rate Limits
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      key TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_attempt_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 12. Campaigns
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_campaigns (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}',
      name TEXT NOT NULL,
      description TEXT,
      multiplier REAL NOT NULL DEFAULT 2.0,
      bonus_points INTEGER NOT NULL DEFAULT 0,
      days_of_week TEXT NOT NULL DEFAULT '1,2,3,4,5,6,0',
      start_time TEXT,
      end_time TEXT,
      start_date TEXT,
      end_date TEXT,
      min_spend REAL NOT NULL DEFAULT 0.0,
      applicable_sectors TEXT NOT NULL DEFAULT 'ALL',
      is_active INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);
  safeAddColumn(db, "loyalty_campaigns", `restaurant_id TEXT NOT NULL DEFAULT '${DEFAULT_RESTAURANT_ID}'`);

  // 13. Email Verification Tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);

  // 14. Customer OTP Verifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_otp_verifications (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      identifier TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'WHATSAPP',
      otp_code TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);

  // 15. Contact Leads
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      restaurant_name TEXT NOT NULL,
      branch_count INTEGER DEFAULT 1,
      pos_system TEXT,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'NEW',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Create compound and lookup indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_customers_resto_doc ON customers(restaurant_id, document_number);
    CREATE INDEX IF NOT EXISTS idx_customers_resto_phone ON customers(restaurant_id, phone);
    CREATE INDEX IF NOT EXISTS idx_customers_resto_name ON customers(restaurant_id, name);
    CREATE INDEX IF NOT EXISTS idx_customers_resto_exp ON customers(restaurant_id, points_expire_at);
    CREATE INDEX IF NOT EXISTS idx_customers_resto_enrolled ON customers(restaurant_id, loyalty_enrolled);
    CREATE INDEX IF NOT EXISTS idx_customers_resto_fudo ON customers(restaurant_id, fudo_customer_id);

    CREATE INDEX IF NOT EXISTS idx_sales_resto_cust ON sales(restaurant_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_resto_date ON sales(restaurant_id, sale_date);
    CREATE INDEX IF NOT EXISTS idx_sales_resto_ext ON sales(restaurant_id, external_sale_id);

    CREATE INDEX IF NOT EXISTS idx_batches_resto_fifo ON points_batches(restaurant_id, customer_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_points_history_resto_cust ON points_history(restaurant_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_rewards_resto ON loyalty_rewards(restaurant_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_campaigns_resto ON loyalty_campaigns(restaurant_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_admin_resto ON admin_users(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_otp_lookup ON customer_otp_verifications(restaurant_id, identifier, otp_code);
  `);

  // Ensure NULL restaurant_ids in existing single-tenant rows are backfilled
  db.exec(`
    UPDATE customers SET restaurant_id = '${DEFAULT_RESTAURANT_ID}' WHERE restaurant_id IS NULL;
    UPDATE sales SET restaurant_id = '${DEFAULT_RESTAURANT_ID}' WHERE restaurant_id IS NULL;
    UPDATE points_batches SET restaurant_id = '${DEFAULT_RESTAURANT_ID}' WHERE restaurant_id IS NULL;
    UPDATE points_history SET restaurant_id = '${DEFAULT_RESTAURANT_ID}' WHERE restaurant_id IS NULL;
    UPDATE loyalty_settings SET restaurant_id = '${DEFAULT_RESTAURANT_ID}' WHERE restaurant_id IS NULL;
    UPDATE loyalty_rewards SET restaurant_id = '${DEFAULT_RESTAURANT_ID}' WHERE restaurant_id IS NULL;
    UPDATE loyalty_campaigns SET restaurant_id = '${DEFAULT_RESTAURANT_ID}' WHERE restaurant_id IS NULL;
    UPDATE fudo_config SET restaurant_id = '${DEFAULT_RESTAURANT_ID}' WHERE restaurant_id IS NULL;
    UPDATE admin_users SET restaurant_id = '${DEFAULT_RESTAURANT_ID}' WHERE restaurant_id IS NULL;
  `);

  // Safe cleanup: Des-enrolar cualquier cliente cargado previamente con CUIT de persona jurídica (empresa)
  db.prepare(`
    UPDATE customers
    SET loyalty_enrolled = 0
    WHERE LENGTH(REPLACE(REPLACE(document_number, '-', ''), '.', '')) = 11
      AND SUBSTR(REPLACE(REPLACE(document_number, '-', ''), '.', ''), 1, 2) IN ('30', '33', '34', '50', '51', '55')
      AND loyalty_enrolled = 1
  `).run();

  // Re-enable foreign keys
  db.exec("PRAGMA foreign_keys = ON;");

  // Seed default settings for demo resto if none exists
  const settingsCount = (db.prepare("SELECT COUNT(*) as count FROM loyalty_settings WHERE restaurant_id = ?").get(DEFAULT_RESTAURANT_ID) as { count: number }).count;
  if (settingsCount === 0) {
    db.prepare(`
      INSERT INTO loyalty_settings (restaurant_id, points_earning_rate, points_expiration_days, points_lifetime_days, min_spend_for_visit, visit_cooldown_hours, allow_visit_table, allow_visit_counter, allow_visit_delivery)
      VALUES (?, 100.0, 90, 365, 1500.0, 18, 1, 0, 0)
    `).run(DEFAULT_RESTAURANT_ID);
  }

  // Seed default Fudo config for demo resto if none exists
  const fudoConfigCount = (db.prepare("SELECT COUNT(*) as count FROM fudo_config WHERE restaurant_id = ?").get(DEFAULT_RESTAURANT_ID) as { count: number }).count;
  if (fudoConfigCount === 0) {
    db.prepare(`
      INSERT INTO fudo_config (restaurant_id, api_key, api_secret, base_url, auth_url, auto_sync_enabled, sync_interval_minutes)
      VALUES (?, 'DEMO_FUDO_KEY_RESTO99', 'DEMO_FUDO_SECRET_XYZ888', 'https://api.fu.do/v1alpha1', 'https://auth.fu.do/api', 0, 60)
    `).run(DEFAULT_RESTAURANT_ID);
  }

  // Seed rewards for demo resto if none exists
  const rewardsCount = (db.prepare("SELECT COUNT(*) as count FROM loyalty_rewards WHERE restaurant_id = ?").get(DEFAULT_RESTAURANT_ID) as { count: number }).count;
  if (rewardsCount === 0) {
    const defaultRewards = [
      { name: "Café de Especialidad + Medialuna", type: "POINTS", req: 150, desc: "Canjeable en barra o merienda" },
      { name: "Postre de la Casa (Flan / Tiramisú)", type: "POINTS", req: 300, desc: "A elección de la carta dulce" },
      { name: "Trago de Autor / Cocktail Signature", type: "POINTS", req: 450, desc: "Coctelería clásica o de autor" },
      { name: "Hamburguesa Gourmet con Papas", type: "POINTS", req: 800, desc: "Cualquier hamburguesa del menú con papas rústicas" },
      { name: "Cena Degustación para 2 personas", type: "POINTS", req: 2000, desc: "Menú de 3 pasos con maridaje para dos" },
      { name: "Hito: 20% OFF en tu 5ta Visita", type: "VISIT_MILESTONE", req: 5, desc: "Premio exclusivo por frecuencia al alcanzar 5 visitas" },
      { name: "Hito: Vino Reserva en tu 10ma Visita", type: "VISIT_MILESTONE", req: 10, desc: "Botella de Vino de Bodega Seleccionada para llevar o consumir" },
      { name: "Cortesía Anual: Postre de Cumpleaños de la Casa", type: "BIRTHDAY_GIFT", req: 0, desc: "Agasajo gratuito por cumpleaños para comensales fidelizados" },
    ];

    const insertReward = db.prepare(`
      INSERT INTO loyalty_rewards (restaurant_id, name, reward_type, requirement_value, is_active, description)
      VALUES (?, ?, ?, ?, 1, ?)
    `);

    for (const r of defaultRewards) {
      insertReward.run(DEFAULT_RESTAURANT_ID, r.name, r.type, r.req, r.desc);
    }
  }

  // Seed default campaigns for demo resto if none exists
  const campaignsCount = (db.prepare("SELECT COUNT(*) as count FROM loyalty_campaigns WHERE restaurant_id = ?").get(DEFAULT_RESTAURANT_ID) as { count: number }).count;
  if (campaignsCount === 0) {
    db.prepare(`
      INSERT INTO loyalty_campaigns (id, restaurant_id, name, description, multiplier, bonus_points, days_of_week, start_time, end_time, applicable_sectors, is_active, priority)
      VALUES 
        ('camp-happy-hour', ?, 'Happy Hour After Office (x2)', 'Doble puntos en consumos de salón entre las 18:00 y las 20:30 hs de lunes a viernes.', 2.0, 0, '1,2,3,4,5', '18:00', '20:30', 'TABLE', 1, 10),
        ('camp-almuerzos-valle', ?, 'Almuerzos Días Valle (x1.5)', 'Puntos acelerados x1.5 para incentivar el consumo de almuerzos martes y miércoles.', 1.5, 0, '2,3', '12:00', '15:30', 'ALL', 1, 5)
    `).run(DEFAULT_RESTAURANT_ID, DEFAULT_RESTAURANT_ID);
  }

  // Seed sample customers for demo resto if empty
  const customersCount = (db.prepare("SELECT COUNT(*) as count FROM customers WHERE restaurant_id = ?").get(DEFAULT_RESTAURANT_ID) as { count: number }).count;
  if (customersCount === 0) {
    const now = new Date();
    const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const future80 = new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000).toISOString();
    const future10 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayBirthday = `1992-${mm}-${dd}`;

    const insertCust = db.prepare(`
      INSERT INTO customers (id, restaurant_id, document_number, phone, email, name, birth_date, points_balance, total_spent, visit_count, last_visit_at, points_expire_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const cust1Id = crypto.randomUUID();
    insertCust.run(cust1Id, DEFAULT_RESTAURANT_ID, "30123456", "+5491144445555", "juan.perez@email.com", "Juan Pérez", todayBirthday, 480, 48000.0, 4, yesterday, future90);

    const cust2Id = crypto.randomUUID();
    insertCust.run(cust2Id, DEFAULT_RESTAURANT_ID, "28987654", "+5491166667777", "maria.fer@email.com", "María Fernández", "1988-11-15", 950, 95000.0, 8, yesterday, future80);

    const cust3Id = crypto.randomUUID();
    insertCust.run(cust3Id, DEFAULT_RESTAURANT_ID, "35444333", "+5491122223333", "carlos.r@email.com", "Carlos Rodríguez", "1995-03-20", 150, 15000.0, 1, yesterday, future10);

    const cust4Id = crypto.randomUUID();
    insertCust.run(cust4Id, DEFAULT_RESTAURANT_ID, "40111222", "+5491188889999", "lucia.g@email.com", "Lucía Gómez", "1998-07-04", 2150, 215000.0, 14, yesterday, future90);

    // Seed sample FIFO batches for Juan
    const insertBatch = db.prepare(`
      INSERT INTO points_batches (id, restaurant_id, customer_id, points_earned, points_remaining, expires_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `);

    const batch1Exp = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString();
    const batch2Exp = new Date(now.getTime() + 340 * 24 * 60 * 60 * 1000).toISOString();
    insertBatch.run(crypto.randomUUID(), DEFAULT_RESTAURANT_ID, cust1Id, 250, 250, batch1Exp, yesterday);
    insertBatch.run(crypto.randomUUID(), DEFAULT_RESTAURANT_ID, cust1Id, 230, 230, batch2Exp, yesterday);

    const insertHistory = db.prepare(`
      INSERT INTO points_history (id, restaurant_id, customer_id, points, concept, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertHistory.run(crypto.randomUUID(), DEFAULT_RESTAURANT_ID, cust1Id, 250, "Consumo Salón Ticket #1042", yesterday);
    insertHistory.run(crypto.randomUUID(), DEFAULT_RESTAURANT_ID, cust1Id, 230, "Consumo Cena Ticket #1198", yesterday);
  }
}
