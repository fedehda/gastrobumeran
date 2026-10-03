/**
 * TEST SUITE: ALTA BIDIRECCIONAL DE CLIENTES EN FUDO POS
 * 
 * Uso: npx tsx src/scripts/test-fudo-customer.ts
 */

import { FudoApiClient } from "../lib/fudo/client";
import { createCustomer, findCustomerByFudoId } from "../lib/db/customer-repo";

async function runTest() {
  console.log("================================================================");
  console.log("🔄 INICIANDO PRUEBAS DE CREACIÓN BIDIRECCIONAL EN FUDO POS");
  console.log("================================================================\n");

  const fudoClient = new FudoApiClient();
  console.log("1. 🔌 Verificando estado del cliente Fudo:");
  console.log(`  • Modo: ${fudoClient.isSandbox() ? "Simulador Sandbox Oficial" : "API Real"}`);

  // 2. Probar creación directa en Fudo
  console.log("\n2. 🚀 Probando createCustomer en Fudo:");
  const testDni = `39${Math.floor(100000 + Math.random() * 900000)}`;
  const fudoCustomer = await fudoClient.createCustomer({
    name: "Ignacio Restô Gourmet",
    documentNumber: testDni,
    phone: "+5491122334455",
    email: "ignacio.resto@email.test",
  });

  console.log("  ✓ Cliente creado en Fudo:", {
    id: fudoCustomer.id,
    name: fudoCustomer.name,
    fiscalNumber: fudoCustomer.fiscalNumber,
    phone: fudoCustomer.phone,
    email: fudoCustomer.email,
  });

  if (!fudoCustomer.id || !fudoCustomer.id.startsWith("FUDO-CUST-")) {
    throw new Error(`Fallo: ID devuelto por Fudo no válido (${fudoCustomer.id})`);
  }

  // 3. Probar vinculación atómica en GastroBumeran
  console.log("\n3. 🔗 Probando vinculación atómica en GastroBumeran:");
  const localCustomer = createCustomer({
    document_number: testDni,
    name: "Ignacio Restô Gourmet",
    phone: "+5491122334455",
    email: "ignacio.resto@email.test",
    fudo_customer_id: fudoCustomer.id,
  });

  console.log("  ✓ Cliente local en base de datos:", {
    id: localCustomer.id,
    fudo_customer_id: localCustomer.fudo_customer_id,
    name: localCustomer.name,
    document_number: localCustomer.document_number,
  });

  if (localCustomer.fudo_customer_id !== fudoCustomer.id) {
    throw new Error(`Fallo: fudo_customer_id no coincide (${localCustomer.fudo_customer_id} vs ${fudoCustomer.id})`);
  }

  // 4. Probar búsqueda inversa por Fudo ID
  console.log("\n4. 🔍 Probando búsqueda inversa por fudo_customer_id:");
  const foundByFudo = findCustomerByFudoId(fudoCustomer.id);
  if (!foundByFudo || foundByFudo.id !== localCustomer.id) {
    throw new Error("Fallo: No se pudo localizar al comensal por su ID de Fudo.");
  }
  console.log(`  ✓ Comensal recuperado con éxito por su fudo_customer_id: ${foundByFudo.name} (${foundByFudo.document_number})`);

  console.log("\n================================================================");
  console.log("🎉 ¡PRUEBA DE ALTA BIDIRECCIONAL EN FUDO COMPLETADA CON ÉXITO!");
  console.log("================================================================\n");
}

runTest().catch((err) => {
  console.error("❌ Falló la prueba de alta en Fudo:", err);
  process.exit(1);
});
