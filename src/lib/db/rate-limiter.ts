import { getDatabase } from "./db";

export interface RateLimitCheckResult {
  isLocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

export interface FailedAttemptResult extends RateLimitCheckResult {
  delayMs: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const WINDOW_MINUTES = 15;

/**
 * Normaliza la clave para el rate limit (IP + tipo de autenticación)
 */
export function buildRateLimitKey(ip: string, authType: "pin" | "password", identifier?: string): string {
  const cleanIp = (ip || "127.0.0.1").trim();
  if (authType === "pin") {
    return `auth:pin:${cleanIp}`;
  }
  const cleanId = (identifier || "global").trim().toLowerCase();
  return `auth:password:${cleanIp}:${cleanId}`;
}

/**
 * Verifica si la clave se encuentra actualmente bloqueada por exceso de intentos fallidos.
 */
export function checkRateLimit(key: string): RateLimitCheckResult {
  const db = getDatabase();
  const now = Date.now();

  const row = db.prepare("SELECT attempts, locked_until, last_attempt_at FROM auth_rate_limits WHERE key = ?").get(key) as
    | { attempts: number; locked_until: string | null; last_attempt_at: string }
    | undefined;

  if (!row) {
    return {
      isLocked: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  // Verificar si hay bloqueo activo
  if (row.locked_until) {
    const lockTime = new Date(row.locked_until).getTime();
    if (lockTime > now) {
      const retryAfterSeconds = Math.max(1, Math.ceil((lockTime - now) / 1000));
      return {
        isLocked: true,
        remainingAttempts: 0,
        retryAfterSeconds,
      };
    } else {
      // El bloqueo expiró, limpiar registro
      db.prepare("DELETE FROM auth_rate_limits WHERE key = ?").run(key);
      return {
        isLocked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
        retryAfterSeconds: 0,
      };
    }
  }

  // Verificar ventana de tiempo de inactividad
  const lastAttemptTime = new Date(row.last_attempt_at).getTime();
  if (now - lastAttemptTime > WINDOW_MINUTES * 60 * 1000) {
    db.prepare("DELETE FROM auth_rate_limits WHERE key = ?").run(key);
    return {
      isLocked: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - row.attempts);
  return {
    isLocked: remaining <= 0,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
  };
}

/**
 * Registra un intento fallido, calcula el retardo incremental y bloquea si se supera el umbral.
 */
export function recordFailedAttempt(key: string): FailedAttemptResult {
  const db = getDatabase();
  const now = new Date();
  const nowIso = now.toISOString();

  const row = db.prepare("SELECT attempts, locked_until FROM auth_rate_limits WHERE key = ?").get(key) as
    | { attempts: number; locked_until: string | null }
    | undefined;

  const currentAttempts = (row?.attempts || 0) + 1;
  const isLocked = currentAttempts >= MAX_FAILED_ATTEMPTS;

  let lockedUntilIso: string | null = null;
  let retryAfterSeconds = 0;

  if (isLocked) {
    const unlockTime = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
    lockedUntilIso = unlockTime.toISOString();
    retryAfterSeconds = LOCKOUT_MINUTES * 60;
  }

  if (row) {
    db.prepare(`
      UPDATE auth_rate_limits
      SET attempts = ?, locked_until = ?, last_attempt_at = ?
      WHERE key = ?
    `).run(currentAttempts, lockedUntilIso, nowIso, key);
  } else {
    db.prepare(`
      INSERT INTO auth_rate_limits (key, attempts, locked_until, last_attempt_at)
      VALUES (?, ?, ?, ?)
    `).run(key, currentAttempts, lockedUntilIso, nowIso);
  }

  // Retardo incremental progresivo para frenar timing attacks y scripts rápidos
  const delayMs = Math.min(1500, currentAttempts * 350);

  return {
    isLocked,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - currentAttempts),
    retryAfterSeconds,
    delayMs,
  };
}

/**
 * Limpia el contador de intentos fallidos tras un inicio de sesión exitoso.
 */
export function resetRateLimit(key: string): void {
  const db = getDatabase();
  db.prepare("DELETE FROM auth_rate_limits WHERE key = ?").run(key);
}
