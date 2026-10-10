import { getDatabase, DEFAULT_RESTAURANT_ID } from "../lib/db/db";
import { provisionRestaurant } from "../lib/db/restaurant-repo";
import { createStoredHash } from "../lib/db/auth-repo";
import crypto from "crypto";

async function seedCleanDemo() {
  console.log("===============================================================");
  console.log("🍔🔁 SEEDING GASTROBUMERAN: ENTORNO DEMO PARA PORTFOLIO");
  console.log("===============================================================\n");

  const db = getDatabase();

  // 1. Limpiar tenants temporales generados por tests automáticos
  db.prepare("DELETE FROM restaurants WHERE id LIKE 'test-resto-%'").run();

  // 2. Asegurar que el restaurante principal esté actualizado y con branding impecable
  db.prepare(`
    INSERT INTO restaurants (
      id, slug, name, legal_name, cuit, status, logo_url,
      primary_color, accent_color, address, city, phone, whatsapp, instagram, timezone, is_listed
    ) VALUES (
      ?, 'demo', 'GastroBumeran Restó & Cervecería', 'GastroBumeran SAS', '30-11223344-5',
      'ACTIVE', '/gastro-icon.svg', '#f59e0b', '#d97706',
      'Av. Corrientes 1234', 'Buenos Aires', '+54 11 4444-5555', '+54 9 11 4444-5555', '@gastrobumeran.resto',
      'America/Argentina/Buenos_Aires', 1
    )
    ON CONFLICT(id) DO UPDATE SET
      name = 'GastroBumeran Restó & Cervecería',
      slug = 'demo',
      status = 'ACTIVE',
      primary_color = '#f59e0b',
      accent_color = '#d97706',
      address = 'Av. Corrientes 1234',
      city = 'Buenos Aires',
      phone = '+54 11 4444-5555',
      whatsapp = '+54 9 11 4444-5555',
      instagram = '@gastrobumeran.resto'
  `).run(DEFAULT_RESTAURANT_ID);

  // 3. Aprovisionar catálogo, reglas y campañas
  provisionRestaurant(DEFAULT_RESTAURANT_ID);

  // 4. Crear o actualizar usuarios admin y mozo
  const adminPass = createStoredHash("admin123");
  const adminPin = createStoredHash("1234");
  const mozoPin = createStoredHash("4321");
  const now = new Date().toISOString();

  const existingAdmin = db.prepare("SELECT id FROM admin_users WHERE email = ?").get("admin@gastrobumeran.com") as { id: string } | undefined;
  if (existingAdmin) {
    db.prepare("UPDATE admin_users SET password_hash = ?, pin_hash = ?, restaurant_id = ? WHERE id = ?").run(adminPass, adminPin, DEFAULT_RESTAURANT_ID, existingAdmin.id);
  } else {
    db.prepare(`
      INSERT INTO admin_users (id, restaurant_id, name, email, password_hash, pin_hash, role, created_at)
      VALUES (?, ?, 'Administrador Principal', 'admin@gastrobumeran.com', ?, ?, 'ADMIN', ?)
    `).run(crypto.randomUUID(), DEFAULT_RESTAURANT_ID, adminPass, adminPin, now);
  }

  const existingMozo = db.prepare("SELECT id FROM admin_users WHERE email = ?").get("mozo@gastrobumeran.com") as { id: string } | undefined;
  if (existingMozo) {
    db.prepare("UPDATE admin_users SET pin_hash = ?, restaurant_id = ? WHERE id = ?").run(mozoPin, DEFAULT_RESTAURANT_ID, existingMozo.id);
  } else {
    db.prepare(`
      INSERT INTO admin_users (id, restaurant_id, name, email, password_hash, pin_hash, role, created_at)
      VALUES (?, ?, 'Juan Mozo (Terminal)', 'mozo@gastrobumeran.com', ?, ?, 'OPERATOR', ?)
    `).run(crypto.randomUUID(), DEFAULT_RESTAURANT_ID, adminPass, mozoPin, now);
  }

  // 5. Crear Comensales Showcase realistas
  const customers = [
    {
      id: "cust-val-rossi",
      doc: "38123456",
      name: "Valentina Rossi",
      phone: "+54 9 11 4567-8901",
      email: "valentina.rossi@email.com",
      birth: "1994-10-15",
      points: 1420,
      visits: 12,
      spent: 98500,
    },
    {
      id: "cust-santi-morales",
      doc: "36456789",
      name: "Santiago Morales",
      phone: "+54 9 11 5678-1234",
      email: "santi.morales@email.com",
      birth: "1991-03-22",
      points: 680,
      visits: 6,
      spent: 54000,
    },
    {
      id: "cust-cami-fernandez",
      doc: "40789123",
      name: "Camila Fernández",
      phone: "+54 9 11 6789-2345",
      email: "camila.f@email.com",
      birth: "1998-07-10",
      points: 250,
      visits: 2,
      spent: 21500,
    },
    {
      id: "cust-martin-gomez",
      doc: "35111222",
      name: "Martín Gómez",
      phone: "+54 9 11 7890-3456",
      email: "martin.gomez@email.com",
      birth: "1990-12-05",
      points: 180,
      visits: 1,
      spent: 14200,
    },
    {
      id: "cust-lucia-benitez",
      doc: "39555666",
      name: "Lucía Benítez",
      phone: "+54 9 11 8901-4567",
      email: "lucia.b@email.com",
      birth: "1996-05-18",
      points: 520,
      visits: 5,
      spent: 43800,
    },
    {
      id: "cust-mariano-gourmet",
      doc: "40123999",
      name: "Mariano Gourmet",
      phone: "+54 9 11 9012-5678",
      email: "mariano.gourmet@email.com",
      birth: "1997-10-12",
      points: 350,
      visits: 3,
      spent: 29000,
    },
  ];

  const insertCust = db.prepare(`
    INSERT INTO customers (
      id, restaurant_id, document_number, name, phone, email, birth_date,
      points_balance, total_spent, visit_count, last_visit_at, loyalty_enrolled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), 1)
    ON CONFLICT(restaurant_id, document_number) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      email = excluded.email,
      birth_date = excluded.birth_date,
      points_balance = excluded.points_balance,
      total_spent = excluded.total_spent,
      visit_count = excluded.visit_count,
      loyalty_enrolled = 1
  `);

  for (const c of customers) {
    insertCust.run(c.id, DEFAULT_RESTAURANT_ID, c.doc, c.name, c.phone, c.email, c.birth, c.points, c.spent, c.visits);
    const existing = db.prepare("SELECT id FROM customers WHERE restaurant_id = ? AND document_number = ?").get(DEFAULT_RESTAURANT_ID, c.doc) as { id: string };
    const actualId = existing.id;

    // Asegurar lote FIFO activo para este cliente
    db.prepare(`
      INSERT OR REPLACE INTO points_batches (
        id, restaurant_id, customer_id, points_earned, points_remaining, expires_at, status
      ) VALUES (
        ?, ?, ?, ?, ?, datetime('now', '+90 days'), 'ACTIVE'
      )
    `).run(`batch-${actualId}`, DEFAULT_RESTAURANT_ID, actualId, c.points, c.points);
  }

  console.log("✅ Restaurante principal 'demo' configurado:");
  console.log("   • Nombre: GastroBumeran Restó & Cervecería");
  console.log("   • Slug: demo (/r/demo)");
  console.log("   • Usuarios de prueba:");
  console.log("     - Admin: admin@gastrobumeran.com (Contraseña: admin123 | PIN: 1234)");
  console.log("     - Mozo/Terminal: mozo@gastrobumeran.com (PIN: 4321)");
  console.log(`✅ ${customers.length} comensales realistas sembrados con saldos, visitas y lotes FIFO.`);
  console.log("✅ Catálogo de 9 premios, cortesía de cumpleaños y campañas activas listos para usar.");
  console.log("\n===============================================================");
  console.log("🚀 DEMO DE PORTFOLIO LISTA Y OPERATIVA AL 100%");
  console.log("===============================================================\n");
}

seedCleanDemo().catch((err) => {
  console.error(err);
  process.exit(1);
});
