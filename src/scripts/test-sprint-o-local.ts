/**
 * Test Suite: Sprint O en Rama local-offline
 * Verificación de Personalización de Tarjeta del Cliente, Aislamiento SQLite y Exportación Cloud-SaaS
 */

import { getDatabase } from "../lib/db/db";
import {
  getLocalRestaurant,
  updateLocalRestaurant,
  getRestaurantBranding,
  createCustomerOtp,
  verifyCustomerOtp,
  getMigrationDiagnostics,
  exportLocalDataForCloudSaas,
} from "../lib/db/restaurant-repo";
import { getCustomerPortalData, findCustomerByDocument } from "../lib/db/customer-repo";

async function runTests() {
  console.log("===================================================================");
  console.log("  SUITE DE PRUEBAS: SPRINT O & PREPARACIÓN CLOUD-SAAS EN SQLITE   ");
  console.log("===================================================================\n");

  const db = getDatabase();

  // 1. Verificación de Tablas SQLite
  console.log("1. Verificando esquema SQLite...");
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const tableNames = tables.map((t) => t.name);

  if (!tableNames.includes("restaurants")) {
    throw new Error("FAIL: La tabla 'restaurants' no existe en SQLite.");
  }
  if (!tableNames.includes("customer_otp_verifications")) {
    throw new Error("FAIL: La tabla 'customer_otp_verifications' no existe en SQLite.");
  }
  console.log("✔ Tablas 'restaurants' y 'customer_otp_verifications' presentes en SQLite.");

  // 2. Verificación de Columnas restaurant_id
  console.log("\n2. Verificando columna 'restaurant_id' en tablas de negocio...");
  const tablesToCheck = [
    "customers",
    "sales",
    "points_batches",
    "points_history",
    "loyalty_settings",
    "loyalty_rewards",
    "loyalty_campaigns",
    "fudo_config",
  ];

  for (const table of tablesToCheck) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    const hasRestoId = cols.some((c) => c.name === "restaurant_id");
    if (!hasRestoId) {
      throw new Error(`FAIL: La tabla '${table}' no posee la columna 'restaurant_id'.`);
    }
  }
  console.log("✔ Todas las tablas de negocio poseen 'restaurant_id' para compatibilidad multi-tenant.");

  // 3. Verificación de Restaurante Local Semilla
  console.log("\n3. Verificando restaurante local por defecto...");
  const resto = getLocalRestaurant();
  console.log("   • ID:", resto.id);
  console.log("   • Nombre:", resto.name);
  console.log("   • Slug:", resto.slug);
  console.log("   • Color Primario:", resto.primary_color);
  console.log("   • Ícono Sellos:", resto.stamp_icon);

  if (!resto.id || !resto.slug) {
    throw new Error("FAIL: El restaurante local no se inicializó correctamente.");
  }
  console.log("✔ Restaurante local inicializado con éxito.");

  // 4. Prueba de Actualización de Branding (Customización de Tarjeta)
  console.log("\n4. Probando personalización de tarjeta (Branding)...");
  const updatedResto = updateLocalRestaurant({
    name: "Cervecería & Grill Patagonia",
    slug: "patagonia-grill",
    primary_color: "#10b981", // Esmeralda
    stamp_icon: "🍺",
    card_slogan: "Pasaporte Cervecero VIP",
    whatsapp: "+5491199998888",
    instagram: "@patagoniagrill",
  });

  if (
    updatedResto.name !== "Cervecería & Grill Patagonia" ||
    updatedResto.slug !== "patagonia-grill" ||
    updatedResto.primary_color !== "#10b981" ||
    updatedResto.stamp_icon !== "🍺"
  ) {
    throw new Error("FAIL: Los valores de personalización no se persistieron correctamente.");
  }
  console.log("✔ Personalización guardada en SQLite:", {
    nombre: updatedResto.name,
    slug: updatedResto.slug,
    color: updatedResto.primary_color,
    sello: updatedResto.stamp_icon,
    lema: updatedResto.card_slogan,
  });

  // 5. Consulta de Tarjeta del Cliente con Branding
  console.log("\n5. Verificando que la tarjeta del comensal adopte el branding...");
  let customer = findCustomerByDocument("28987654") || findCustomerByDocument("30123456");
  if (!customer) {
    const first = db.prepare("SELECT document_number FROM customers LIMIT 1").get() as { document_number: string } | undefined;
    if (first) {
      customer = findCustomerByDocument(first.document_number);
    }
  }

  if (!customer) {
    throw new Error("FAIL: Ningún cliente disponible en base de datos para la prueba.");
  }

  const doc = customer.document_number;
  const cardData = getCustomerPortalData(doc);
  if (!cardData) {
    throw new Error(`FAIL: No se pudo generar la tarjeta del cliente ${doc}.`);
  }

  if (!cardData.restaurant) {
    throw new Error("FAIL: La tarjeta del comensal no incluye la entidad de branding del restaurante.");
  }

  if (cardData.restaurant.name !== "Cervecería & Grill Patagonia") {
    throw new Error(`FAIL: Nombre en tarjeta no coincide: ${cardData.restaurant.name}`);
  }

  if (cardData.restaurant.stamp_icon !== "🍺") {
    throw new Error(`FAIL: Ícono de sello en tarjeta no coincide: ${cardData.restaurant.stamp_icon}`);
  }

  if (!cardData.qr_payload.startsWith("GASTRO:patagonia-grill:DNI:")) {
    throw new Error(`FAIL: El payload del código QR no incluye el slug del restaurante: ${cardData.qr_payload}`);
  }

  console.log("✔ Tarjeta del comensal enriquecida correctamente:", {
    titular: cardData.customer.name,
    puntos: cardData.customer.points_balance,
    restaurante_tarjeta: cardData.restaurant.name,
    color_primario: cardData.restaurant.primary_color,
    sello: cardData.restaurant.stamp_icon,
    qr_payload: cardData.qr_payload,
  });

  // 6. Prueba de Flujo OTP
  console.log("\n6. Probando generación y verificación de código OTP...");
  const { otpCode } = createCustomerOtp(doc, "WHATSAPP");
  if (!otpCode || otpCode.length !== 6) {
    throw new Error("FAIL: El código OTP no se generó como numérico de 6 dígitos.");
  }

  // Código erróneo debe fallar
  const invalidAttempt = verifyCustomerOtp(doc, "999999");
  if (invalidAttempt) {
    throw new Error("FAIL: Se aceptó un código OTP inválido.");
  }

  // Código correcto debe validar
  const validAttempt = verifyCustomerOtp(doc, otpCode);
  if (!validAttempt) {
    throw new Error("FAIL: No se validó el código OTP correcto.");
  }

  // Sandbox bypass (123456)
  const sandboxAttempt = verifyCustomerOtp(doc, "123456");
  if (!sandboxAttempt) {
    throw new Error("FAIL: Sandbox bypass de OTP falló.");
  }
  console.log("✔ Generación y validación de OTP funcionando correctamente.");

  // 7. Prueba de Diagnóstico y Exportación para Cloud-SaaS
  console.log("\n7. Probando generación de paquete de migración Cloud-SaaS...");
  const diagnostics = getMigrationDiagnostics();
  if (!diagnostics.is_ready_for_cloud) {
    throw new Error("FAIL: La base SQLite no se reporta 100% lista para Cloud-SaaS.");
  }

  const exportBundle = exportLocalDataForCloudSaas();
  if (!exportBundle.metadata || exportBundle.metadata.system !== "GastroBumeran Local Offline") {
    throw new Error("FAIL: Metadatos de exportación incompletos.");
  }

  if (!exportBundle.restaurant || exportBundle.restaurant.slug !== "patagonia-grill") {
    throw new Error("FAIL: Restaurante en exportación incompleto o desalineado.");
  }

  if (exportBundle.customers.length === 0 || exportBundle.loyalty_rewards.length === 0) {
    throw new Error("FAIL: Clientes o recompensas ausentes en paquete de exportación.");
  }

  console.log("✔ Paquete de exportación Cloud-SaaS verificado:", {
    version: exportBundle.metadata.export_version,
    restaurante: exportBundle.restaurant.name,
    clientes_exportados: exportBundle.stats.total_customers,
    lotes_fifo_exportados: exportBundle.stats.total_batches,
    puntos_totales_circulantes: exportBundle.stats.total_active_points,
  });

  // Restaurar nombre demo amigable
  updateLocalRestaurant({
    name: "GastroBumeran Restó",
    slug: "mi-resto",
    primary_color: "#f59e0b",
    stamp_icon: "🍔",
    card_slogan: "Club de Fidelización Gastronómica",
  });

  console.log("\n===================================================================");
  console.log("✔ TODAS LAS PRUEBAS DE SPRINT O Y MIGRACIÓN COMPLETADAS CON ÉXITO!");
  console.log("===================================================================\n");
}

runTests().catch((err) => {
  console.error("Error en test-sprint-o-local:", err);
  process.exit(1);
});
