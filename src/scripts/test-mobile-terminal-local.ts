import { getDatabase } from "../lib/db/db";
import {
  createCustomer,
  getCustomerPortalData,
} from "../lib/db/customer-repo";
import { getRestaurantBranding } from "../lib/db/restaurant-repo";
import { authenticateWithPin } from "../lib/db/auth-repo";
import { processSale, redeemReward } from "../lib/loyalty/engine";

async function runLocalMobileTerminalTests() {
  console.log("===============================================================");
  console.log("🧪 TESTING MOBILE TERMINAL EN ENTORNO LOCAL-OFFLINE");
  console.log("===============================================================\n");

  const db = getDatabase();
  const branding = getRestaurantBranding();
  console.log(`📍 Local Detectado: "${branding.name}" (Slug: "${branding.slug}")`);

  // 1. Validar autenticación de PIN de operador
  console.log("\n--- TEST 1: AUTENTICACIÓN CON PIN EN LOCAL-OFFLINE ---");
  const testPin = "1234"; // Default admin/caja PIN
  const authUser = authenticateWithPin(testPin);
  if (!authUser) {
    throw new Error(`❌ No se pudo autenticar con el PIN ${testPin}.`);
  }
  console.log(`✅ PIN ${testPin} verificado con éxito para: "${authUser.name}" (Rol: ${authUser.role})`);

  // 2. Preparar cliente de prueba con puntos
  console.log("\n--- TEST 2: TARJETA DEL CLIENTE Y BALANCES ---");
  const testDni = "33445566";
  db.prepare("DELETE FROM points_batches WHERE customer_id IN (SELECT id FROM customers WHERE document_number = ?)").run(testDni);
  db.prepare("DELETE FROM points_history WHERE customer_id IN (SELECT id FROM customers WHERE document_number = ?)").run(testDni);
  db.prepare("DELETE FROM sales WHERE customer_id IN (SELECT id FROM customers WHERE document_number = ?)").run(testDni);
  db.prepare("DELETE FROM customers WHERE document_number = ?").run(testDni);

  const customer = createCustomer({
    document_number: testDni,
    name: "Federico Mozo Tester",
    phone: "+5491133445566",
    email: "fede.local@gastrobumeran.local",
    loyalty_enrolled: 1,
  });

  processSale({
    customerId: customer.id,
    totalAmount: 20000,
    source: "MANUAL",
    concept: "Cena en Mesa 12",
  });

  // 3. Probar lectura inteligente de QRs
  console.log("\n--- TEST 3: PARSEO INTELIGENTE DE CÓDIGOS QR MÓVILES ---");
  const qrFormats = [
    { label: "Formato Nativo Scoped", payload: `GASTRO:${branding.slug}:DNI:${testDni}` },
    { label: "Formato Global", payload: `GASTRO:DNI:${testDni}` },
    { label: "Enlace URL de Portal PWA", payload: `https://gastrobumeran.local/portal?dni=${testDni}` },
    { label: "Enlace URL Scoped Resto", payload: `https://gastrobumeran.local/r/${branding.slug}?dni=${testDni}` },
    { label: "DNI Numérico Directo", payload: `${testDni}` },
  ];

  for (const { label, payload } of qrFormats) {
    const cardData = getCustomerPortalData(payload);
    if (!cardData || cardData.customer.document_number !== testDni) {
      throw new Error(`❌ Falló la resolución para el formato "${label}": ${payload}`);
    }
    console.log(`✅ [${label}] detectado y decodificado correctamente.`);
  }

  // 4. Verificar tarjeta del cliente en catálogo local
  console.log("\n--- TEST 4: INSPECCIÓN DE LA TARJETA DEL CLIENTE ---");
  const card = getCustomerPortalData(testDni)!;
  console.log(`Cliente: ${card.customer.name}`);
  console.log(`DNI: ${card.customer.document_number}`);
  console.log(`Categoría/Tier: ${card.tier.name} (Nivel ${card.tier.level})`);
  console.log(`Saldo de Puntos: ${card.customer.points_balance} pts`);
  console.log(`Visitas: ${card.customer.visit_count}`);
  console.log(`Premios en catálogo local: ${card.rewards_progress.length}`);

  const redeemableRewards = card.rewards_progress.filter((r) => r.is_redeemable);
  console.log(`Premios canjeables de inmediato: ${redeemableRewards.length}`);
  if (redeemableRewards.length === 0) {
    throw new Error("El cliente debería tener al menos un premio canjeable con 20.000 consumidos.");
  }

  // 5. Probar ejecución del canje del producto
  console.log("\n--- TEST 5: ACEPTACIÓN Y PROCESAMIENTO DEL CANJE ---");
  const targetReward = redeemableRewards[0];
  console.log(`Intentando canjear producto: "${targetReward.reward.name}" (${targetReward.reward.requirement_value} pts)`);

  const prevBalance = card.customer.points_balance;
  const redemptionResult = redeemReward(card.customer.id, targetReward.reward.id);

  console.log(`Resultado del motor: ${redemptionResult.message}`);
  console.log(`Puntos debitados: ${redemptionResult.points_deducted} pts`);
  console.log(`Nuevo saldo restante: ${redemptionResult.customer.points_balance} pts`);

  if (targetReward.reward.reward_type === "POINTS") {
    const expectedBalance = prevBalance - targetReward.reward.requirement_value;
    if (redemptionResult.customer.points_balance !== expectedBalance) {
      throw new Error(`❌ El saldo post-canje (${redemptionResult.customer.points_balance}) no coincide con lo esperado (${expectedBalance}).`);
    }
  }

  // Limpieza
  db.prepare("DELETE FROM points_batches WHERE customer_id = ?").run(customer.id);
  db.prepare("DELETE FROM points_history WHERE customer_id = ?").run(customer.id);
  db.prepare("DELETE FROM sales WHERE customer_id = ?").run(customer.id);
  db.prepare("DELETE FROM customers WHERE id = ?").run(customer.id);

  console.log("\n===============================================================");
  console.log("🎉 PRUEBAS EN LOCAL-OFFLINE COMPLETADAS EXITOSAMENTE");
  console.log("===============================================================");
}

runLocalMobileTerminalTests().catch((err) => {
  console.error("FATAL ERROR EN TEST LOCAL:", err);
  process.exit(1);
});
