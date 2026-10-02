import { findCustomerByDocument, createCustomer, checkBirthdayStatus } from "@/lib/db/customer-repo";
import { processSale, redeemReward, redeemBirthdayCourtesy, runExpirationAudit } from "@/lib/loyalty/engine";
import { getActiveRewards, getLoyaltySettings } from "@/lib/db/settings-repo";
import { getDatabase } from "@/lib/db/db";
import { PointsBatch } from "@/types/loyalty";

async function main() {
  console.log("=== PRUEBAS DEL MOTOR CON ANEXO: DOBLE TIMER, FIFO Y CUMPLEAÑOS ===");

  // 1. Settings con Timer 2 (365 días)
  const settings = getLoyaltySettings();
  console.log("1. Parámetros globales:", {
    tasa: settings.points_earning_rate,
    inactividad_timer1: settings.points_expiration_days,
    lote_vida_timer2: settings.points_lifetime_days,
  });

  // 2. Cliente con cumpleaños hoy
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayBirthday = `${mm}-${dd}`; // Sin año (solo Día y Mes)

  const testDoc = "88991122";
  let customer = findCustomerByDocument(testDoc);
  if (!customer) {
    customer = createCustomer({
      document_number: testDoc,
      name: "Valeria Gourmet",
      phone: "+5491177889900",
      email: "valeria@foodie.com",
      birth_date: todayBirthday,
    });
    console.log("2. Cliente de prueba creado:", customer.name, "Cumpleaños:", customer.birth_date);
  } else {
    // Reset test state for repeatable runs
    getDatabase().prepare("UPDATE customers SET last_birthday_reward_year = NULL WHERE id = ?").run(customer.id);
    customer = findCustomerByDocument(testDoc)!;
  }

  // 3. Verificar estado de cumpleaños
  const bdayStatus = checkBirthdayStatus(customer);
  console.log("\n3. Estado de cumpleaños:", bdayStatus);
  if (!bdayStatus.isEligible) {
    throw new Error("El cliente debería ser elegible para el cumpleaños hoy.");
  }

  // 4. Canjear cortesía de cumpleaños
  console.log("\n4. Canjeando cortesía de cumpleaños (Postre de la Casa)...");
  const bdayClaim = redeemBirthdayCourtesy(customer.id);
  console.log("Resultado Cortesía:", bdayClaim.message);

  // Intentar canjear de nuevo en el mismo año (Prueba Antifraude)
  console.log("4b. Prueba antifraude: intentando segundo canje de cumpleaños en el mismo año...");
  try {
    redeemBirthdayCourtesy(customer.id);
    console.error("❌ Falló antifraude de cumpleaños: permitió doble canje.");
  } catch (err: unknown) {
    console.log("✔ Antifraude de cumpleaños validado:", err instanceof Error ? err.message : String(err));
  }

  // 5. Carga de ventas para probar Timer 2 y Lotes FIFO
  console.log("\n5. Generando Lote 1 ($30.000 -> 300 pts)...");
  processSale({
    customerId: customer.id,
    totalAmount: 30000,
    concept: "Consumo Almuerzo Lote 1",
  });

  console.log("Generando Lote 2 ($20.000 -> 200 pts)...");
  processSale({
    customerId: customer.id,
    totalAmount: 20000,
    concept: "Consumo Cena Lote 2",
  });

  const db = getDatabase();
  const batches = db.prepare(`
    SELECT * FROM points_batches WHERE customer_id = ? AND status = 'ACTIVE' ORDER BY expires_at ASC
  `).all(customer.id) as PointsBatch[];
  console.log("Lotes activos antes del canje:", batches.map((b) => ({
    id: b.id.slice(0, 8),
    earned: b.points_earned,
    remaining: b.points_remaining,
    status: b.status,
    expires_at: b.expires_at,
  })));

  // 6. Canje con algoritmo FIFO
  // Canjeamos un premio de 350 pts. Debería consumir los 300 pts del Lote 1 (agotándolo) y 50 pts del Lote 2.
  const rewards = getActiveRewards();
  const dessertReward = rewards.find((r) => r.reward_type === "POINTS" && r.requirement_value === 300);
  if (dessertReward) {
    console.log(`\n6. Ejecutando canje FIFO de "${dessertReward.name}" (${dessertReward.requirement_value} pts)...`);
    const redemption = redeemReward(customer.id, dessertReward.id);
    console.log("Resultado Canje FIFO:", {
      puntos_debitados: redemption.points_deducted,
      lotes_consumidos: redemption.batches_consumed,
      nuevo_saldo: redemption.customer.points_balance,
    });

    const batchesAfter = db.prepare(`
      SELECT * FROM points_batches WHERE customer_id = ? ORDER BY expires_at ASC
    `).all(customer.id) as PointsBatch[];
    console.log("Estado de lotes post-canje FIFO:", batchesAfter.map((b) => ({
      id: b.id.slice(0, 8),
      remaining: b.points_remaining,
      status: b.status,
    })));
  }

  // 7. Auditoría nocturna (Doble Timer)
  console.log("\n7. Ejecutando auditoría de doble timer...");
  const audit = runExpirationAudit();
  console.log("Resultado auditoría:", audit);

  // 8. Regla de Negocio: Pedidos en Mostrador / Take Away / Delivery (Puntos Sí, Visitas No)
  console.log("\n8. Probando regla de negocio: Pedidos en Mostrador (Puntos Sí, Visitas No)...");
  const custBeforeCounter = findCustomerByDocument(testDoc)!;
  const initialVisits = custBeforeCounter.visit_count;
  const initialPoints = custBeforeCounter.points_balance;
  const initialSpent = custBeforeCounter.total_spent;
  const lastVisitBefore = custBeforeCounter.last_visit_at;

  const counterAmount = 25000;
  const expectedPoints = Math.floor(counterAmount / settings.points_earning_rate);

  const counterSale = processSale({
    customerId: custBeforeCounter.id,
    totalAmount: counterAmount,
    saleType: "COUNTER",
    concept: "Take Away / Mostrador - Hamburguesas",
  });

  console.log("Resultado venta mostrador:", {
    puntos_ganados: counterSale.points_earned,
    visita_sumada: counterSale.visit_added,
    mensaje: counterSale.message,
    visitas_cliente: counterSale.customer.visit_count,
  });

  if (counterSale.visit_added !== false) {
    throw new Error("❌ Error: La venta de mostrador no debió sumar visita (visit_added debe ser false).");
  }
  if (counterSale.customer.visit_count !== initialVisits) {
    throw new Error(`❌ Error: visit_count cambió de ${initialVisits} a ${counterSale.customer.visit_count} en una venta de mostrador.`);
  }
  if (counterSale.customer.last_visit_at !== lastVisitBefore) {
    throw new Error("❌ Error: last_visit_at no debió alterarse en una venta de mostrador.");
  }
  if (counterSale.points_earned !== expectedPoints) {
    throw new Error(`❌ Error: Se esperaban ${expectedPoints} puntos pero se obtuvieron ${counterSale.points_earned}.`);
  }
  if (counterSale.customer.points_balance !== initialPoints + expectedPoints) {
    throw new Error("❌ Error: El saldo de puntos del cliente no se incrementó correctamente.");
  }
  if (counterSale.customer.total_spent !== initialSpent + counterAmount) {
    throw new Error("❌ Error: El total gastado no se acumuló correctamente.");
  }
  console.log("✔ Venta de mostrador validada: acreditó puntos y preservó intactas las visitas.");

  console.log("\n=== TODAS LAS PRUEBAS DEL MOTOR COMPLETADAS CON ÉXITO ===");
}

main().catch(console.error);
