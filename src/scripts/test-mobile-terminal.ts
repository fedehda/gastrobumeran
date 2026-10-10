import { getDatabase, DEFAULT_RESTAURANT_ID } from "../lib/db/db";
import {
  createCustomer,
  getCustomerPortalData,
} from "../lib/db/customer-repo";
import { getRestaurantById } from "../lib/db/restaurant-repo";
import { authenticateWithPin, createAdminUser } from "../lib/db/auth-repo";
import { processSale, redeemReward } from "../lib/loyalty/engine";

async function runMobileTerminalTests() {
  console.log("===============================================================");
  console.log("🧪 TESTING MOBILE TERMINAL PWA: QR, TARJETA & CANJES");
  console.log("===============================================================\n");

  const db = getDatabase();
  const restoId = DEFAULT_RESTAURANT_ID;
  const restaurant = getRestaurantById(restoId);
  if (!restaurant) {
    throw new Error("Restaurante por defecto no encontrado.");
  }
  console.log(`📍 Local de Prueba: ${restaurant.name} (Slug: ${restaurant.slug})`);

  // 1. Validar autenticación por PIN para personal de salón / mozos
  console.log("\n--- TEST 1: AUTENTICACIÓN CON PIN DE TERMINAL ---");
  const testPin = "4321";
  const userEmail = "mozo.test@gastrobumeran.local";

  // Crear usuario con rol OPERATOR/CASHIER para la prueba si no existe
  db.prepare("DELETE FROM admin_users WHERE email = ?").run(userEmail);
  const staffUser = createAdminUser({
    restaurant_id: restoId,
    name: "Juan Mozo",
    email: userEmail,
    pin: testPin,
    role: "OPERATOR",
  });

  const authResult = authenticateWithPin(testPin, restoId);
  if (!authResult || authResult.id !== staffUser.id) {
    throw new Error("❌ Error en autenticación por PIN de operador.");
  }
  console.log(`✅ PIN ${testPin} autenticado con éxito para operador: "${authResult.name}" (Rol: ${authResult.role})`);

  // 2. Preparar cliente de prueba con puntos y visitas
  console.log("\n--- TEST 2: TARJETA DEL CLIENTE Y BALANCES ---");
  const testDni = "40123999";
  db.prepare("DELETE FROM points_batches WHERE customer_id IN (SELECT id FROM customers WHERE document_number = ?)").run(testDni);
  db.prepare("DELETE FROM points_history WHERE customer_id IN (SELECT id FROM customers WHERE document_number = ?)").run(testDni);
  db.prepare("DELETE FROM sales WHERE customer_id IN (SELECT id FROM customers WHERE document_number = ?)").run(testDni);
  db.prepare("DELETE FROM customers WHERE document_number = ? AND restaurant_id = ?").run(testDni, restoId);

  const customer = createCustomer(
    {
      document_number: testDni,
      name: "Mariano Gourmet",
      phone: "+5491122334455",
      email: "mariano@test.local",
      loyalty_enrolled: 1,
    },
    restoId
  );

  // Acreditarle una venta para que tenga saldo y visitas
  processSale({
    customerId: customer.id,
    totalAmount: 15000,
    source: "MANUAL",
    concept: "Cena en Salón (Mesa 4)",
    restaurantId: restoId,
  });

  // 3. Probar lectura de diferentes formatos de códigos QR
  console.log("\n--- TEST 3: PARSEO INTELIGENTE DE CÓDIGOS QR MÓVILES ---");
  const qrFormats = [
    { label: "Formato Nativo Scoped", payload: `GASTRO:${restaurant.slug}:DNI:${testDni}`, expectedReward: null },
    { label: "Formato Global", payload: `GASTRO:DNI:${testDni}`, expectedReward: null },
    { label: "Enlace URL de Portal PWA", payload: `https://gastrobumeran.local/portal?dni=${testDni}`, expectedReward: null },
    { label: "Enlace URL Scoped Resto", payload: `https://gastrobumeran.local/r/${restaurant.slug}?dni=${testDni}`, expectedReward: null },
    { label: "DNI Numérico Directo", payload: `${testDni}`, expectedReward: null },
    { label: "QR Canje Específico (Global)", payload: `GASTRO:REDEEM:1:DNI:${testDni}`, expectedReward: 1 },
    { label: "QR Canje Específico (Scoped Resto)", payload: `GASTRO:${restaurant.slug}:REDEEM:2:DNI:${testDni}`, expectedReward: 2 },
    { label: "QR Canje Específico (URL con params)", payload: `https://gastrobumeran.local/portal?dni=${testDni}&redeem=3`, expectedReward: 3 },
  ];

  for (const { label, payload, expectedReward } of qrFormats) {
    const cardData = getCustomerPortalData(payload, restoId, restaurant.slug);
    if (!cardData || cardData.customer.document_number !== testDni) {
      throw new Error(`❌ Falló la resolución para el formato "${label}": ${payload}`);
    }

    // Verificar extracción de recompensa solicitada por regex
    const redeemMatch = payload.match(/(?:REDEEM:|redeem=)(\d+)/i);
    const parsedRewardId = redeemMatch ? parseInt(redeemMatch[1], 10) : null;
    if (parsedRewardId !== expectedReward) {
      throw new Error(`❌ Error extrayendo recompensa para "${label}". Esperado: ${expectedReward}, Obtenido: ${parsedRewardId}`);
    }

    console.log(`✅ [${label}] detectado y decodificado correctamente (Reward ID: ${parsedRewardId || "Ninguno"}).`);
  }

  // 4. Verificar tarjeta del cliente: saldo, nivel, recompensas disponibles
  console.log("\n--- TEST 4: INSPECCIÓN DE LA TARJETA DEL CLIENTE ---");
  const card = getCustomerPortalData(testDni, restoId, restaurant.slug)!;
  console.log(`Cliente: ${card.customer.name}`);
  console.log(`DNI: ${card.customer.document_number}`);
  console.log(`Categoría/Tier: ${card.tier.name} (Nivel ${card.tier.level})`);
  console.log(`Saldo de Puntos: ${card.customer.points_balance} pts`);
  console.log(`Visitas: ${card.customer.visit_count}`);
  console.log(`Premios en catálogo para este local: ${card.rewards_progress.length}`);

  const redeemableRewards = card.rewards_progress.filter((r) => r.is_redeemable);
  console.log(`Premios canjeables de inmediato: ${redeemableRewards.length}`);
  if (redeemableRewards.length === 0) {
    throw new Error("El cliente debería tener al menos un premio canjeable con 15.000 consumidos.");
  }

  // 5. Probar ejecución del canje del producto
  console.log("\n--- TEST 5: ACEPTACIÓN Y PROCESAMIENTO DEL CANJE ---");
  const targetReward = redeemableRewards[0];
  console.log(`Intentando canjear producto: "${targetReward.reward.name}" (${targetReward.reward.requirement_value} pts)`);

  const prevBalance = card.customer.points_balance;
  const redemptionResult = redeemReward(card.customer.id, targetReward.reward.id, restoId);

  console.log(`Resultado del motor: ${redemptionResult.message}`);
  console.log(`Puntos debitados: ${redemptionResult.points_deducted} pts`);
  console.log(`Nuevo saldo restante: ${redemptionResult.customer.points_balance} pts`);

  if (targetReward.reward.reward_type === "POINTS") {
    const expectedBalance = prevBalance - targetReward.reward.requirement_value;
    if (redemptionResult.customer.points_balance !== expectedBalance) {
      throw new Error(`❌ El saldo post-canje (${redemptionResult.customer.points_balance}) no coincide con lo esperado (${expectedBalance}).`);
    }
  }

  // Verificar que la auditoría en points_history existe
  const auditRow = db.prepare("SELECT * FROM points_history WHERE id = ?").get(redemptionResult.points_history_entry.id);
  if (!auditRow) {
    throw new Error("❌ No se encontró el registro de auditoría en points_history.");
  }
  console.log("✅ Comprobante de transacción verificado en auditoría.");

  // Limpieza de datos de prueba
  db.prepare("DELETE FROM points_batches WHERE customer_id = ?").run(customer.id);
  db.prepare("DELETE FROM points_history WHERE customer_id = ?").run(customer.id);
  db.prepare("DELETE FROM sales WHERE customer_id = ?").run(customer.id);
  db.prepare("DELETE FROM customers WHERE id = ?").run(customer.id);
  db.prepare("DELETE FROM admin_users WHERE id = ?").run(staffUser.id);

  console.log("\n===============================================================");
  console.log("🎉 TODAS LAS PRUEBAS DE TERMINAL MÓVIL COMPLETADAS CON ÉXITO");
  console.log("===============================================================");
}

runMobileTerminalTests().catch((err) => {
  console.error("FATAL ERROR IN TEST:", err);
  process.exit(1);
});
