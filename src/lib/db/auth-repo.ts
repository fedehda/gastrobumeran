import { getDatabase, DEFAULT_RESTAURANT_ID } from "./db";
import { AdminUser, AdminRole, AuthSession } from "@/types/loyalty";
import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "gastrobumeran_jwt_secret_loyalty_2026";

function hashSecret(secret: string, salt: string): string {
  return crypto.pbkdf2Sync(secret, salt, 10000, 64, "sha512").toString("hex");
}

function verifySecret(secret: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;
  const hash = hashSecret(secret, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

export function createStoredHash(secret: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashSecret(secret, salt);
  return `${salt}:${hash}`;
}

export function ensureDefaultAdmin(): void {
  const db = getDatabase();
  const count = (db.prepare("SELECT COUNT(*) as count FROM admin_users").get() as { count: number }).count;
  if (count === 0) {
    const id = crypto.randomUUID();
    const passHash = createStoredHash("admin123");
    const pinHash = createStoredHash("1234");
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO admin_users (id, restaurant_id, name, email, password_hash, pin_hash, role, created_at)
      VALUES (?, ?, 'Administrador Principal', 'admin@gastrobumeran.com', ?, ?, 'ADMIN', ?)
    `).run(id, DEFAULT_RESTAURANT_ID, passHash, pinHash, now);
  }
}

export function createAdminUser(input: {
  restaurant_id?: string | null;
  name: string;
  email: string;
  password?: string;
  pin?: string;
  role?: AdminRole;
}): AdminUser {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const passHash = createStoredHash(input.password || "admin123");
  const pinHash = createStoredHash(input.pin || "1234");
  const role: AdminRole = input.role || "ADMIN";
  const restoId = input.restaurant_id || null;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO admin_users (id, restaurant_id, name, email, password_hash, pin_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, restoId, input.name.trim(), input.email.trim().toLowerCase(), passHash, pinHash, role, now);

  return getUserById(id)!;
}

export function authenticateWithPassword(
  email: string,
  password: string,
  restaurantId?: string
): AdminUser | null {
  ensureDefaultAdmin();
  const db = getDatabase();
  const cleanEmail = email.trim().toLowerCase();

  let userRow:
    | {
        id: string;
        restaurant_id: string | null;
        name: string;
        email: string;
        password_hash: string;
        role: AdminRole;
        created_at: string;
      }
    | undefined;

  if (restaurantId) {
    userRow = db.prepare(`
      SELECT * FROM admin_users
      WHERE LOWER(email) = ? AND (restaurant_id = ? OR role = 'PLATFORM_ADMIN')
    `).get(cleanEmail, restaurantId) as any;
  } else {
    userRow = db.prepare("SELECT * FROM admin_users WHERE LOWER(email) = ?").get(cleanEmail) as any;
  }

  if (!userRow) return null;

  const isValid = verifySecret(password, userRow.password_hash);
  if (!isValid) return null;

  return getUserById(userRow.id);
}

export function authenticateWithPin(pin: string, restaurantId?: string): AdminUser | null {
  ensureDefaultAdmin();
  const db = getDatabase();
  const cleanPin = pin.trim();

  let users: Array<{
    id: string;
    restaurant_id: string | null;
    name: string;
    email: string;
    pin_hash: string;
    role: AdminRole;
    created_at: string;
  }>;

  if (restaurantId) {
    users = db.prepare("SELECT * FROM admin_users WHERE restaurant_id = ?").all(restaurantId) as any;
  } else {
    users = db.prepare("SELECT * FROM admin_users").all() as any;
  }

  for (const u of users) {
    if (verifySecret(cleanPin, u.pin_hash)) {
      return getUserById(u.id);
    }
  }

  return null;
}

export function getUserById(id: string): AdminUser | null {
  const db = getDatabase();
  const userRow = db.prepare(`
    SELECT u.id, u.restaurant_id, u.name, u.email, u.role, u.created_at,
           r.name as restaurant_name, r.slug as restaurant_slug
    FROM admin_users u
    LEFT JOIN restaurants r ON r.id = u.restaurant_id
    WHERE u.id = ?
  `).get(id) as (AdminUser & { restaurant_name?: string | null; restaurant_slug?: string | null }) | undefined;

  if (!userRow) return null;

  return {
    id: userRow.id,
    restaurant_id: userRow.restaurant_id,
    restaurant_name: userRow.restaurant_name || null,
    restaurant_slug: userRow.restaurant_slug || null,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    created_at: userRow.created_at,
  };
}

export function createSessionToken(user: AdminUser): AuthSession {
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurant_id: user.restaurant_id,
    restaurant_slug: user.restaurant_slug,
    restaurant_name: user.restaurant_name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  const token = `${headerB64}.${payloadB64}.${signature}`;
  const expiresAt = new Date(payload.exp * 1000).toISOString();

  return {
    user,
    token,
    expiresAt,
  };
}

export function verifySessionToken(token: string): AdminUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null; // Expired
    }

    return getUserById(payload.sub);
  } catch {
    return null;
  }
}
