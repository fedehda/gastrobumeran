import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "gastrobumeran.sqlite");

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

function initDatabase(db: DatabaseSync) {
  db.exec("PRAGMA foreign_keys = ON;");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      fudo_customer_id TEXT UNIQUE,
      document_number TEXT UNIQUE NOT NULL,
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_customers_doc ON customers(document_number);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_expiration ON customers(points_expire_at);

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      external_sale_id TEXT UNIQUE,
      customer_id TEXT,
      source TEXT NOT NULL,
      total_amount REAL NOT NULL,
      sale_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CLOSED',
      visit_added INTEGER NOT NULL DEFAULT 0,
      import_batch_id TEXT,
      claimed_at TEXT,
      claimed_by_customer_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);

    CREATE TABLE IF NOT EXISTS points_batches (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      sale_id TEXT,
      points_earned INTEGER NOT NULL,
      points_remaining INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_batches_fifo ON points_batches(customer_id, expires_at);

    CREATE TABLE IF NOT EXISTS points_history (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      sale_id TEXT,
      points INTEGER NOT NULL,
      concept TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_points_history_customer ON points_history(customer_id);
    CREATE INDEX IF NOT EXISTS idx_points_history_created ON points_history(created_at);

    CREATE TABLE IF NOT EXISTS loyalty_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      points_earning_rate REAL NOT NULL DEFAULT 100.0,
      points_expiration_days INTEGER NOT NULL DEFAULT 90,
      points_lifetime_days INTEGER NOT NULL DEFAULT 365,
      min_spend_for_visit REAL NOT NULL DEFAULT 1500.0,
      visit_cooldown_hours INTEGER NOT NULL DEFAULT 18,
      allow_visit_table INTEGER NOT NULL DEFAULT 1,
      allow_visit_counter INTEGER NOT NULL DEFAULT 0,
      allow_visit_delivery INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      reward_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS csv_mapping_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      system_name TEXT NOT NULL UNIQUE,
      mapping_config TEXT NOT NULL,
      delimiter TEXT DEFAULT ';',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fudo_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key TEXT NOT NULL DEFAULT '',
      api_secret TEXT NOT NULL DEFAULT '',
      base_url TEXT NOT NULL DEFAULT 'https://api.fu.do/v1alpha1',
      auth_url TEXT NOT NULL DEFAULT 'https://auth.fu.do/api',
      bearer_token TEXT,
      token_expires_at TEXT,
      last_sync_at TEXT,
      auto_sync_enabled INTEGER NOT NULL DEFAULT 0,
      sync_interval_minutes INTEGER NOT NULL DEFAULT 60,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cron_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_name TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      details_json TEXT,
      executed_at TEXT DEFAULT (datetime('now')),
      duration_ms INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ADMIN',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sales_external_id ON sales(external_sale_id);
    CREATE INDEX IF NOT EXISTS idx_customers_fudo_id ON customers(fudo_customer_id);
    CREATE INDEX IF NOT EXISTS idx_cron_logs_job ON cron_logs(job_name);
    CREATE INDEX IF NOT EXISTS idx_cron_logs_executed ON cron_logs(executed_at);
    CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
  `);

  // Safe migrations for pre-existing tables
  safeAddColumn(db, "customers", "birth_date TEXT");
  safeAddColumn(db, "customers", "last_birthday_reward_year INTEGER");
  safeAddColumn(db, "customers", "fudo_customer_id TEXT");
  safeAddColumn(db, "sales", "claimed_at TEXT");
  safeAddColumn(db, "sales", "claimed_by_customer_id TEXT");
  safeAddColumn(db, "sales", "visit_added INTEGER NOT NULL DEFAULT 0");
  safeAddColumn(db, "loyalty_settings", "points_lifetime_days INTEGER NOT NULL DEFAULT 365");
  safeAddColumn(db, "loyalty_settings", "allow_visit_table INTEGER NOT NULL DEFAULT 1");
  safeAddColumn(db, "loyalty_settings", "allow_visit_counter INTEGER NOT NULL DEFAULT 0");
  safeAddColumn(db, "loyalty_settings", "allow_visit_delivery INTEGER NOT NULL DEFAULT 0");
  safeAddColumn(db, "fudo_config", "auth_url TEXT NOT NULL DEFAULT 'https://auth.fu.do/api'");

  // Seed default settings if none exists
  const settingsCount = (db.prepare("SELECT COUNT(*) as count FROM loyalty_settings").get() as { count: number }).count;
  if (settingsCount === 0) {
    db.prepare(`
      INSERT INTO loyalty_settings (points_earning_rate, points_expiration_days, points_lifetime_days, min_spend_for_visit, visit_cooldown_hours, allow_visit_table, allow_visit_counter, allow_visit_delivery)
      VALUES (100.0, 90, 365, 1500.0, 18, 1, 0, 0)
    `).run();
  }

  // Seed default Fudo config if none exists
  const fudoConfigCount = (db.prepare("SELECT COUNT(*) as count FROM fudo_config").get() as { count: number }).count;
  if (fudoConfigCount === 0) {
    db.prepare(`
      INSERT INTO fudo_config (api_key, api_secret, base_url, auth_url, auto_sync_enabled, sync_interval_minutes)
      VALUES ('DEMO_FUDO_KEY_RESTO99', 'DEMO_FUDO_SECRET_XYZ888', 'https://api.fu.do/v1alpha1', 'https://auth.fu.do/api', 0, 60)
    `).run();
  }

  // Seed rewards if none exists
  const rewardsCount = (db.prepare("SELECT COUNT(*) as count FROM loyalty_rewards").get() as { count: number }).count;
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
      INSERT INTO loyalty_rewards (name, reward_type, requirement_value, is_active, description)
      VALUES (?, ?, ?, 1, ?)
    `);

    for (const r of defaultRewards) {
      insertReward.run(r.name, r.type, r.req, r.desc);
    }
  }

  // Ensure birthday reward exists
  const bdayReward = db.prepare("SELECT * FROM loyalty_rewards WHERE reward_type = 'BIRTHDAY_GIFT'").get();
  if (!bdayReward) {
    db.prepare(`
      INSERT INTO loyalty_rewards (name, reward_type, requirement_value, is_active, description)
      VALUES ('Cortesía Anual: Postre de Cumpleaños de la Casa', 'BIRTHDAY_GIFT', 0, 1, 'Agasajo gratuito por cumpleaños para comensales fidelizados')
    `).run();
  }

  // Seed sample customers if empty
  const customersCount = (db.prepare("SELECT COUNT(*) as count FROM customers").get() as { count: number }).count;
  if (customersCount === 0) {
    const now = new Date();
    const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const future80 = new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000).toISOString();
    const future10 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Birthday today string (e.g. 1990-MM-DD using current month and day)
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayBirthday = `1992-${mm}-${dd}`;

    const insertCust = db.prepare(`
      INSERT INTO customers (id, document_number, phone, email, name, birth_date, points_balance, total_spent, visit_count, last_visit_at, points_expire_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const cust1Id = crypto.randomUUID();
    // Juan Pérez has birthday today!
    insertCust.run(cust1Id, "30123456", "+5491144445555", "juan.perez@email.com", "Juan Pérez", todayBirthday, 480, 48000.0, 4, yesterday, future90);

    const cust2Id = crypto.randomUUID();
    insertCust.run(cust2Id, "28987654", "+5491166667777", "maria.fer@email.com", "María Fernández", "1988-11-15", 950, 95000.0, 8, yesterday, future80);

    const cust3Id = crypto.randomUUID();
    insertCust.run(cust3Id, "35444333", "+5491122223333", "carlos.r@email.com", "Carlos Rodríguez", "1995-03-20", 150, 15000.0, 1, yesterday, future10);

    const cust4Id = crypto.randomUUID();
    insertCust.run(cust4Id, "40111222", "+5491188889999", "lucia.g@email.com", "Lucía Gómez", "1998-07-04", 2150, 215000.0, 14, yesterday, future90);

    // Seed sample FIFO batches for Juan
    const insertBatch = db.prepare(`
      INSERT INTO points_batches (id, customer_id, points_earned, points_remaining, expires_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
    `);

    const batch1Exp = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString();
    const batch2Exp = new Date(now.getTime() + 340 * 24 * 60 * 60 * 1000).toISOString();
    insertBatch.run(crypto.randomUUID(), cust1Id, 250, 250, batch1Exp, yesterday);
    insertBatch.run(crypto.randomUUID(), cust1Id, 230, 230, batch2Exp, yesterday);

    const insertHistory = db.prepare(`
      INSERT INTO points_history (id, customer_id, points, concept, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertHistory.run(crypto.randomUUID(), cust1Id, 250, "Consumo Salón Ticket #1042", yesterday);
    insertHistory.run(crypto.randomUUID(), cust1Id, 230, "Consumo Cena Ticket #1198", yesterday);
  }
}
