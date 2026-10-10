import { DEFAULT_RESTAURANT_ID, DEFAULT_RESTAURANT_SLUG } from "@/lib/db/restaurant-repo";

export type AppMode = "offline" | "cloud";

export interface AppConfig {
  mode: AppMode;
  isOffline: boolean;
  isCloud: boolean;
  defaultRestaurantId: string;
  defaultRestaurantSlug: string;
  allowAnonymousOffline: boolean;
}

/**
 * Determina si la aplicación se está ejecutando en Modo Local / Offline (monousuario).
 * Detecta tanto variables de entorno del servidor como variables públicas Next.js.
 */
export function isOfflineMode(): boolean {
  const mode = (
    process.env.APP_MODE ||
    process.env.NEXT_PUBLIC_APP_MODE ||
    ""
  ).trim().toLowerCase();

  const singleTenant = (
    process.env.SINGLE_TENANT ||
    process.env.NEXT_PUBLIC_SINGLE_TENANT ||
    ""
  ).trim().toLowerCase();

  return (
    mode === "offline" ||
    mode === "local" ||
    singleTenant === "true" ||
    singleTenant === "1"
  );
}

export function isCloudMode(): boolean {
  return !isOfflineMode();
}

export function getAppMode(): AppMode {
  return isOfflineMode() ? "offline" : "cloud";
}

export function getDefaultRestaurantId(): string {
  return process.env.LOCAL_RESTAURANT_ID || DEFAULT_RESTAURANT_ID;
}

export function getDefaultRestaurantSlug(): string {
  return process.env.LOCAL_RESTAURANT_SLUG || DEFAULT_RESTAURANT_SLUG;
}

export function getAppConfig(): AppConfig {
  const offline = isOfflineMode();
  return {
    mode: offline ? "offline" : "cloud",
    isOffline: offline,
    isCloud: !offline,
    defaultRestaurantId: getDefaultRestaurantId(),
    defaultRestaurantSlug: getDefaultRestaurantSlug(),
    allowAnonymousOffline: process.env.ALLOW_ANONYMOUS_OFFLINE === "true",
  };
}
