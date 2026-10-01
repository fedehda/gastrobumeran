import {
  getCustomerPortalData,
  calculateCustomerTier,
} from "../lib/db/customer-repo";
import QRCode from "qrcode";

async function runPortalTests() {
  console.log("==================================================");
  console.log("📱 INICIANDO TEST DE SPRINT FUTURO A: PORTAL WEB & QR");
  console.log("==================================================\n");

  // 1. DNI Lookup
  console.log("1. 🔍 Búsqueda de Tarjeta por DNI:");
  const cardByDni = getCustomerPortalData("30123456");
  if (!cardByDni) {
    throw new Error("No se encontró al cliente Martín Fierro con DNI 30123456");
  }
  console.log(`✓ Cliente encontrado: ${cardByDni.customer.name} (DNI: ${cardByDni.customer.document_number})`);
  console.log(`✓ Puntos activos: ${cardByDni.customer.points_balance} pts • Visitas: ${cardByDni.customer.visit_count}`);

  // 2. Lookup with QR prefixes
  console.log("\n2. 🏷️ Limpieza de Prefijos QR de Escáneres (GASTRO:DNI: / GASTRO:CARD:):");
  const cardWithPrefix1 = getCustomerPortalData("GASTRO:DNI:30123456");
  const cardWithPrefix2 = getCustomerPortalData("GASTRO:CARD:30123456");
  if (!cardWithPrefix1 || !cardWithPrefix2) {
    throw new Error("Falló la resolución con prefijo de escáner QR");
  }
  console.log(`✓ Prefijo 'GASTRO:DNI:' resuelto correctamente a ${cardWithPrefix1.customer.name}`);
  console.log(`✓ Prefijo 'GASTRO:CARD:' resuelto correctamente a ${cardWithPrefix2.customer.name}`);

  // 3. Customer Tier System
  console.log("\n3. 🏆 Verificación de Niveles de Fidelización (Tiers):");
  const tierBronce = calculateCustomerTier(0);
  const tierPlata = calculateCustomerTier(3);
  const tierOro = calculateCustomerTier(7);
  const tierVip = calculateCustomerTier(12);

  if (tierBronce.name !== "Bronce" || tierBronce.level !== 1) throw new Error("Fallo en cálculo Bronce");
  if (tierPlata.name !== "Plata" || tierPlata.level !== 2) throw new Error("Fallo en cálculo Plata");
  if (tierOro.name !== "Oro" || tierOro.level !== 3) throw new Error("Fallo en cálculo Oro");
  if (tierVip.name !== "VIP Black" || tierVip.level !== 4) throw new Error("Fallo en cálculo VIP Black");

  console.log(`✓ 0 visitas => Nivel: ${tierBronce.name} (Faltan ${tierBronce.visits_needed_for_next} para ${tierBronce.next_tier_name})`);
  console.log(`✓ 3 visitas => Nivel: ${tierPlata.name} (Faltan ${tierPlata.visits_needed_for_next} para ${tierPlata.next_tier_name})`);
  console.log(`✓ 7 visitas => Nivel: ${tierOro.name} (Faltan ${tierOro.visits_needed_for_next} para ${tierOro.next_tier_name})`);
  console.log(`✓ 12 visitas => Nivel: ${tierVip.name} (Nivel máximo alcanzado, progreso: ${tierVip.progress_percent}%)`);

  // 4. Dual Timer Protection in Card
  console.log("\n4. ⏳ Verificación del Modelo Dual Anti-Inflación en la Ficha:");
  console.log(`✓ Timer 1 (Inactividad): ${cardByDni.days_until_inactivity_expiry !== null ? `${cardByDni.days_until_inactivity_expiry} días restantes` : "Sin activar"}`);
  if (cardByDni.next_expiring_batch) {
    console.log(`✓ Timer 2 (Lote FIFO más antiguo): ${cardByDni.next_expiring_batch.points} pts vencen en ${cardByDni.next_expiring_batch.days_left} días`);
  } else {
    console.log("✓ Timer 2: Sin lotes activos pendientes");
  }

  // 5. Rewards Catalog Progress
  console.log("\n5. 🎁 Catálogo de Recompensas y Barras de Progreso:");
  if (cardByDni.rewards_progress.length === 0) {
    throw new Error("No se encontraron recompensas en el catálogo");
  }
  const unlocked = cardByDni.rewards_progress.filter((r) => r.is_redeemable);
  const inProgress = cardByDni.rewards_progress.filter((r) => !r.is_redeemable);
  console.log(`✓ Total de recompensas evaluadas: ${cardByDni.rewards_progress.length}`);
  console.log(`✓ Desbloqueadas para canje inmediato: ${unlocked.length}`);
  console.log(`✓ En progreso: ${inProgress.length}`);
  if (unlocked.length > 0) {
    console.log(`  - Ejemplo desbloqueado: "${unlocked[0].reward.name}" (${unlocked[0].progress_percent}%)`);
  }
  if (inProgress.length > 0) {
    console.log(`  - Ejemplo en progreso: "${inProgress[0].reward.name}" (${inProgress[0].progress_percent}% - faltan ${inProgress[0].points_needed} pts)`);
  }

  // 6. Dynamic QR Code Generation
  console.log("\n6. 📱 Generación de Código QR Dinámico de Alta Compatibilidad:");
  const qrPayload = cardByDni.qr_payload;
  console.log(`✓ Payload generado: "${qrPayload}"`);
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 256,
    margin: 2,
    errorCorrectionLevel: "H",
  });
  if (!qrDataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("El QR no generó una URL Base64 válida");
  }
  console.log(`✓ Data URL QR generada exitosamente (Longitud: ${qrDataUrl.length} caracteres)`);

  // 7. Non-existent Customer Lookup
  console.log("\n7. 🚫 Validación de Búsqueda Inexistente:");
  const notFound = getCustomerPortalData("99999999999");
  if (notFound !== null) {
    throw new Error("Se esperaba null para un cliente inexistente");
  }
  console.log("✓ Consulta inexistente retorna null de forma segura.");

  console.log("\n==================================================");
  console.log("🎉 ¡TODAS LAS PRUEBAS DE SPRINT FUTURO A PASARON CON 100% DE ÉXITO!");
  console.log("==================================================");
}

runPortalTests().catch((err) => {
  console.error("❌ ERROR EN EL TEST DE PORTAL:", err);
  process.exit(1);
});
