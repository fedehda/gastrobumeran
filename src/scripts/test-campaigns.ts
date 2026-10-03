import { getDatabase } from "@/lib/db/db";
import { findCustomerByDocument, createCustomer } from "@/lib/db/customer-repo";
import {
  createCampaign,
  getCampaignById,
  updateCampaign,
  toggleCampaignActive,
  deleteCampaign,
  findApplicableCampaigns,
  evaluateBestCampaign,
} from "@/lib/db/campaign-repo";
import { processSale, cancelSale } from "@/lib/loyalty/engine";

async function main() {
  console.log("==================================================================");
  console.log("=== TEST SUITE: MOTOR DE CAMPAÑAS DINÁMICAS (SPRINT F) ===");
  console.log("==================================================================\n");

  const db = getDatabase();

  // 1. Test Customer
  const testDoc = "77889900";
  let customer = findCustomerByDocument(testDoc);
  if (!customer) {
    customer = createCustomer({
      document_number: testDoc,
      name: "Valeria Gourmet",
      phone: "+5491177889900",
      email: "valeria@test.com",
    });
  }

  // Reset test customer balance
  db.prepare(`
    UPDATE customers
    SET points_balance = 0, visit_count = 0, total_spent = 0, last_visit_at = NULL
    WHERE id = ?
  `).run(customer.id);
  customer = findCustomerByDocument(testDoc)!;

  console.log("1. Cliente de prueba inicializado:", {
    id: customer.id,
    name: customer.name,
    points: customer.points_balance,
  });

  // 2. TEST: CRUD Operations on Campaigns
  console.log("\n2. Probando operaciones CRUD en repositorio de campañas...");
  const newCamp = createCampaign({
    name: "Promo Test After Office (x2)",
    description: "Campaña de prueba automatizada",
    multiplier: 2.0,
    bonus_points: 50,
    days_of_week: [1, 2, 3, 4, 5], // Lun a Vie
    start_time: "18:00",
    end_time: "20:30",
    applicable_sectors: "TABLE",
    min_spend: 2000,
    priority: 10,
    is_active: true,
  });

  if (!newCamp.id || newCamp.multiplier !== 2.0 || newCamp.bonus_points !== 50) {
    throw new Error(`Error en createCampaign: ${JSON.stringify(newCamp)}`);
  }
  const fetchedCamp = getCampaignById(newCamp.id);
  if (!fetchedCamp || fetchedCamp.id !== newCamp.id) {
    throw new Error("Error en getCampaignById: no se pudo recuperar la campaña por ID");
  }
  console.log("✓ Campaña creada y consultada exitosamente:", newCamp.id, newCamp.name);

  // Update
  const updatedCamp = updateCampaign(newCamp.id, {
    description: "Descripción actualizada por test",
    priority: 15,
  });
  if (updatedCamp.priority !== 15 || updatedCamp.description !== "Descripción actualizada por test") {
    throw new Error("Error en updateCampaign");
  }
  console.log("✓ Campaña actualizada correctamente (prioridad 15)");

  // Toggle active
  const pausedCamp = toggleCampaignActive(newCamp.id, false);
  if (pausedCamp.is_active !== false) throw new Error("Error al pausar campaña");
  const resumedCamp = toggleCampaignActive(newCamp.id, true);
  if (resumedCamp.is_active !== true) throw new Error("Error al reanudar campaña");
  console.log("✓ Toggle active/inactive funciona correctamente");

  // 3. TEST: Temporal & Sector Matching
  console.log("\n3. Probando filtrado y evaluación temporal y por sectores...");

  // Match: Miércoles a las 19:15 hs (Day 3, 19:15, $5000, TABLE) -> Debe coincidir
  const wednesday1915 = new Date("2026-10-07T19:15:00"); // 2026-10-07 is Wednesday (Day 3)
  const applicable1 = findApplicableCampaigns(wednesday1915, 5000, "TABLE");
  const hasTestCamp = applicable1.some((c) => c.id === newCamp.id);
  if (!hasTestCamp) {
    throw new Error("Fallo: La campaña debió coincidir en Miércoles 19:15 hs en Salón");
  }
  console.log("✓ Coincidencia positiva: Miércoles 19:15 hs, $5.000, Salón -> Campaña activa");

  // No Match: Domingo (Day 0) a las 19:15 hs -> Fuera de días Lun-Vie
  const sunday1915 = new Date("2026-10-11T19:15:00"); // 2026-10-11 is Sunday
  const applicableSunday = findApplicableCampaigns(sunday1915, 5000, "TABLE");
  if (applicableSunday.some((c) => c.id === newCamp.id)) {
    throw new Error("Fallo: La campaña no debió coincidir un domingo");
  }
  console.log("✓ Filtrado por día de la semana correcto: Domingo ignorado");

  // No Match: Miércoles a las 15:00 hs -> Fuera de ventana horaria (18:00 - 20:30)
  const wednesday1500 = new Date("2026-10-07T15:00:00");
  const applicableEarly = findApplicableCampaigns(wednesday1500, 5000, "TABLE");
  if (applicableEarly.some((c) => c.id === newCamp.id)) {
    throw new Error("Fallo: La campaña no debió coincidir a las 15:00 hs");
  }
  console.log("✓ Filtrado horario correcto: 15:00 hs ignorado");

  // No Match: Delivery cuando es TABLE only
  const applicableDelivery = findApplicableCampaigns(wednesday1915, 5000, "DELIVERY");
  if (applicableDelivery.some((c) => c.id === newCamp.id)) {
    throw new Error("Fallo: La campaña TABLE no debió coincidir con DELIVERY");
  }
  console.log("✓ Filtrado por canal/sector correcto: DELIVERY ignorado para promo Salón");

  // No Match: Gasto inferior al min_spend ($1.000 < $2.000)
  const applicableLowSpend = findApplicableCampaigns(wednesday1915, 1000, "TABLE");
  if (applicableLowSpend.some((c) => c.id === newCamp.id)) {
    throw new Error("Fallo: La campaña no debió coincidir con importe menor al min_spend");
  }
  console.log("✓ Filtrado por gasto mínimo correcto: $1.000 < $2.000 ignorado");

  // 4. TEST: evaluateBestCampaign Mathematical Accuracy
  console.log("\n4. Probando evaluación óptima matemática...");
  // $10.000 con tasa de 100 -> basePoints = 100
  // Multiplicador 2.0 (+100 extra) + Bonus 50 pts = +150 puntos extra
  const evalResult = evaluateBestCampaign(wednesday1915, 10000, 100, "TABLE");
  if (!evalResult || evalResult.campaign.id !== newCamp.id) {
    throw new Error("Error en evaluateBestCampaign: no seleccionó la campaña óptima");
  }
  if (evalResult.extraPoints !== 150) {
    throw new Error(`Cálculo erróneo de puntos extra. Esperado 150, recibido: ${evalResult.extraPoints}`);
  }
  console.log("✓ Cálculo de puntos extra exacto:", {
    basePoints: 100,
    multiplier: evalResult.multiplier,
    bonusPoints: evalResult.bonusPoints,
    extraPoints: evalResult.extraPoints,
    totalPoints: 100 + evalResult.extraPoints,
  });

  // 5. TEST: End-to-End Loyalty Engine Integration (processSale)
  console.log("\n5. Ingestando venta con campaña dinámica en Loyalty Engine...");
  const saleExtId = `CAMP_TEST_SALE_${Date.now()}`;
  const saleResult = processSale({
    customerId: customer.id,
    totalAmount: 15000, // 150 base pts
    saleDate: wednesday1915.toISOString(),
    saleType: "TABLE",
    externalSaleId: saleExtId,
    source: "MANUAL",
  });

  // 150 base pts + (150 * (2 - 1) + 50 bonus) = 150 + 200 = 350 pts
  if (saleResult.points_earned !== 350) {
    throw new Error(`Puntos acreditados incorrectos: esperado 350, recibido ${saleResult.points_earned}`);
  }
  if (saleResult.base_points !== 150 || saleResult.campaign_bonus_points !== 200) {
    throw new Error(`Desglose incorrecto: base=${saleResult.base_points}, bonus=${saleResult.campaign_bonus_points}`);
  }
  if (!saleResult.applied_campaign || saleResult.applied_campaign.id !== newCamp.id) {
    throw new Error("No se vinculó la campaña en la transacción");
  }
  console.log("✓ Venta procesada con éxito:", {
    totalAmount: 15000,
    basePoints: saleResult.base_points,
    campaignBonus: saleResult.campaign_bonus_points,
    totalEarned: saleResult.points_earned,
    appliedCampaign: saleResult.applied_campaign.name,
  });

  // Verify in Database
  const saleDb = db.prepare("SELECT * FROM sales WHERE id = ?").get(saleResult.sale!.id) as Record<string, unknown>;
  if (saleDb.campaign_id !== newCamp.id || Number(saleDb.campaign_multiplier) !== 2.0 || Number(saleDb.campaign_bonus_points) !== 50) {
    throw new Error(`Datos de campaña en tabla sales no coinciden: ${JSON.stringify(saleDb)}`);
  }

  const historyDb = db.prepare("SELECT * FROM points_history WHERE sale_id = ?").get(saleResult.sale!.id) as Record<string, unknown>;
  if (historyDb.campaign_id !== newCamp.id || !String(historyDb.concept).includes("Promo Test After Office")) {
    throw new Error(`Datos en points_history no reflejan la campaña: ${JSON.stringify(historyDb)}`);
  }
  console.log("✓ Persistencia en DB validada: sales y points_history registran campaña y desglose");

  // Verify FIFO batch
  const batchDb = db.prepare("SELECT * FROM points_batches WHERE sale_id = ?").get(saleResult.sale!.id) as Record<string, unknown>;
  if (Number(batchDb.points_earned) !== 350 || Number(batchDb.points_remaining) !== 350) {
    throw new Error(`Lote FIFO creado con puntaje incorrecto: ${JSON.stringify(batchDb)}`);
  }
  console.log("✓ Lote FIFO verificado: 350 puntos activos");

  // 6. TEST: Atomic Rollback on cancelSale
  console.log("\n6. Probando anulación atómica (cancelSale) con restitución completa de puntos...");
  const cancelResult = cancelSale(saleResult.sale!.id, "Anulación por prueba de rollback");
  if (cancelResult.points_deducted !== 350) {
    throw new Error(`cancelSale debió deducir 350 puntos, dedujo: ${cancelResult.points_deducted}`);
  }

  const customerAfterCancel = findCustomerByDocument(testDoc)!;
  if (customerAfterCancel.points_balance !== 0) {
    throw new Error(`Balance del cliente tras anulación debió volver a 0, está en ${customerAfterCancel.points_balance}`);
  }
  console.log("✓ Anulación atómica verificada: 350 puntos debitados, balance cliente restaurado a 0");

  // Cleanup test campaign
  deleteCampaign(newCamp.id);
  console.log("\n7. Limpieza final: Campaña de prueba eliminada");

  console.log("\n==================================================================");
  console.log("=== ¡TODOS LOS TESTS DE CAMPAÑAS DINÁMICAS PASARON EXITOSAMENTE! ===");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR EN TEST SUITE:", err);
  process.exit(1);
});
