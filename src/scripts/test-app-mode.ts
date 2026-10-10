import {
  isOfflineMode,
  isCloudMode,
  getAppMode,
  getAppConfig,
  getDefaultRestaurantId,
  getDefaultRestaurantSlug,
} from "../lib/config/app-mode";
import { requireSession } from "../lib/auth/require-session";
import { getDatabase, DEFAULT_RESTAURANT_ID } from "../lib/db/db";

async function runTests() {
  console.log("===============================================================");
  console.log("🧪 TESTING MODO CONFIGURABLE: OFFLINE vs. CLOUD SAAS UNIFICADO");
  console.log("===============================================================\n");

  const originalAppMode = process.env.APP_MODE;
  const originalSingleTenant = process.env.SINGLE_TENANT;
  const originalAnonymous = process.env.ALLOW_ANONYMOUS_OFFLINE;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Detección de Modo Cloud por Defecto
    // -------------------------------------------------------------------------
    console.log("--- TEST 1: MODO CLOUD (POR DEFECTO) ---");
    delete process.env.APP_MODE;
    delete process.env.SINGLE_TENANT;

    if (!isCloudMode() || isOfflineMode()) {
      throw new Error("❌ Falló: sin variables de entorno debe ser Cloud por defecto.");
    }
    if (getAppMode() !== "cloud") {
      throw new Error("❌ Falló: getAppMode() debe retornar 'cloud'.");
    }
    console.log("✅ Modo Cloud por defecto detectado correctamente.");

    // -------------------------------------------------------------------------
    // TEST 2: Detección de Modo Offline mediante APP_MODE=offline
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: MODO OFFLINE MEDIANTE APP_MODE=offline ---");
    process.env.APP_MODE = "offline";
    if (!isOfflineMode() || isCloudMode()) {
      throw new Error("❌ Falló: APP_MODE=offline no activó isOfflineMode().");
    }
    if (getAppMode() !== "offline") {
      throw new Error("❌ Falló: getAppMode() debe retornar 'offline'.");
    }
    const configOffline = getAppConfig();
    if (!configOffline.isOffline || configOffline.defaultRestaurantId !== DEFAULT_RESTAURANT_ID) {
      throw new Error("❌ Falló: getAppConfig() en offline no fijó el restaurante default.");
    }
    console.log("✅ APP_MODE=offline activa correctamente el modo local monousuario.");

    // -------------------------------------------------------------------------
    // TEST 3: Detección mediante alias SINGLE_TENANT=true y APP_MODE=local
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: ALIAS SINGLE_TENANT=true y APP_MODE=local ---");
    delete process.env.APP_MODE;
    process.env.SINGLE_TENANT = "true";
    if (!isOfflineMode()) {
      throw new Error("❌ Falló: SINGLE_TENANT=true no activó isOfflineMode().");
    }

    process.env.APP_MODE = "local";
    delete process.env.SINGLE_TENANT;
    if (!isOfflineMode()) {
      throw new Error("❌ Falló: APP_MODE=local no activó isOfflineMode().");
    }
    console.log("✅ Alias SINGLE_TENANT=true y APP_MODE=local reconocidos con éxito.");

    // -------------------------------------------------------------------------
    // TEST 4: Resolución de requireSession en Modo Offline
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: ASIGNACIÓN DETERMINÍSTICA DE RESTAURANT_ID EN OFFLINE ---");
    process.env.APP_MODE = "offline";
    process.env.ALLOW_ANONYMOUS_OFFLINE = "true";

    const sessionOffline = await requireSession();
    if (!sessionOffline.success) {
      throw new Error("❌ Falló: requireSession en offline con anonymous debe autorizar.");
    }
    if (sessionOffline.restaurantId !== DEFAULT_RESTAURANT_ID) {
      throw new Error(
        `❌ Falló: restaurantId esperado '${DEFAULT_RESTAURANT_ID}', obtenido '${sessionOffline.restaurantId}'`
      );
    }
    console.log(`✅ requireSession fijó restaurantId = "${sessionOffline.restaurantId}" sin fugas multi-tenant.`);

    // -------------------------------------------------------------------------
    // TEST 5: Base de Datos SQLite Local y Restaurante Seed
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: VERIFICACIÓN DE BASE DE DATOS LOCAL SQLITE ---");
    const db = getDatabase();
    const seedResto = db
      .prepare("SELECT id, slug, name, status FROM restaurants WHERE id = ?")
      .get(DEFAULT_RESTAURANT_ID) as { id: string; slug: string; name: string; status: string } | undefined;

    if (!seedResto) {
      throw new Error("❌ Falló: No se encontró el restaurante semilla default en SQLite.");
    }
    console.log(`✅ Restaurante Semilla activo en SQLite: "${seedResto.name}" (Slug: ${seedResto.slug}, Status: ${seedResto.status})`);

    console.log("\n===============================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE MODO CONFIGURABLE PASARON CON ÉXITO");
    console.log("===============================================================\n");
  } finally {
    // Restaurar entorno
    if (originalAppMode !== undefined) process.env.APP_MODE = originalAppMode;
    else delete process.env.APP_MODE;

    if (originalSingleTenant !== undefined) process.env.SINGLE_TENANT = originalSingleTenant;
    else delete process.env.SINGLE_TENANT;

    if (originalAnonymous !== undefined) process.env.ALLOW_ANONYMOUS_OFFLINE = originalAnonymous;
    else delete process.env.ALLOW_ANONYMOUS_OFFLINE;
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
