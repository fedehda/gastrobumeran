import { getDatabase } from "./db";
import { AdminUser, AuthSession } from "@/types/loyalty";
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

function createStoredHash(secret: string): string {
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
      INSERT INTO admin_users (id, name, email, password_hash, pin_hash, role, created_at)
      VALUES (?, 'Administrador Principal', 'admin@gastrobumeran.com', ?, ?, 'ADMIN', ?)
    `).run(id, passHash, pinHash, now);
  }
}

export function authenticateWithPassword(email: string, password: string): AdminUser | null {
  ensureDefaultAdmin();
  const db = getDatabase();
  const cleanEmail = email.trim().toLowerCase();

  const userRow = db.prepare("SELECT * FROM admin_users WHERE LOWER(email) = ?").get(cleanEmail) as
    | {
        id: string;
        name: string;
        email: string;
        password_hash: string;
        role: "ADMIN" | "CASHIER" | "SUPERVISOR";
        created_at: string;
      }
    | undefined;

  if (!userRow) return null;

  const isValid = verifySecret(password, userRow.password_hash);
  if (!isValid) return null;

  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    created_at: userRow.created_at,
  };
}

export function authenticateWithPin(pin: string): AdminUser | null {
  ensureDefaultAdmin();
  const db = getDatabase();
  const cleanPin = pin.trim();

  const users = db.prepare("SELECT * FROM admin_users").all() as Array<{
    id: string;
    name: string;
    email: string;
    pin_hash: string;
    role: "ADMIN" | "CASHIER" | "SUPERVISOR";
    created_at: string;
  }>;

  for (const u of users) {
    if (verifySecret(cleanPin, u.pin_hash)) {
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
      };
    }
  }

  return null;
}

export function getUserById(id: string): AdminUser | null {
  const db = getDatabase();
  const userRow = db.prepare("SELECT id, name, email, role, created_at FROM admin_users WHERE id = ?").get(id) as
    | AdminUser
    | undefined;
  return userRow || null;
}

export function createSessionToken(user: AdminUser): AuthSession {
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
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
