import { FudoTranslator } from "../lib/pos/adapters/fudo/fudo-translator";
import { FudoAdapter } from "../lib/pos/adapters/fudo/fudo-adapter";
import { posGateway } from "../lib/pos/core/pos-gateway";
import { FudoRawSale, FudoRawCustomer, FudoRawCustomerAttributes } from "../lib/pos/adapters/fudo/types";

async function runTranslatorTests() {
  console.log("===============================================================");
  console.log("🧩 TEST: MÓDULO DE TRADUCCIÓN POS & ADAPTADORES (DESACOPLADO)");
  console.log("===============================================================\n");

  // 1. Test: Normalización de tipos de comanda
  console.log("1. 🍽️ Verificando normalización de tipos de comanda:");
  const testTypes = [
    { input: "TAKEAWAY", expected: "COUNTER" },
    { input: "mostrador_1", expected: "COUNTER" },
    { input: "DELIVERY_EXPRESS", expected: "DELIVERY" },
    { input: "envio_domicilio", expected: "DELIVERY" },
    { input: "TABLE_SALON_A", expected: "TABLE" },
    { input: "salon", expected: "TABLE" },
    { input: "", expected: "TABLE" },
  ];

  for (const t of testTypes) {
    const res = FudoTranslator.normalizeSaleType(t.input);
    if (res !== t.expected) {
      throw new Error(`Fallo en normalizeSaleType('${t.input}'): Esperado '${t.expected}', recibido '${res}'`);
    }
  }
  console.log("  ✓ Todas las variantes de comanda normalizadas correctamente.");

  // 2. Test: Traducción de Fudo Raw Sale (con JSON:API relationships y customers incluidos)
  console.log("\n2. 📦 Verificando traducción de Venta Fudo a CanonicalSale:");
  const rawSale: FudoRawSale = {
    id: "TEST-SALE-99",
    attributes: {
      total: 45000.5,
      closedAt: "2026-10-02T22:30:00.000Z",
      saleState: "CLOSED",
      saleType: "MOSTRADOR",
    },
    relationships: {
      customer: {
        data: { id: "CUST-XYZ-1", type: "Customer" },
      },
    },
  };

  const includedMap = new Map<string, FudoRawCustomerAttributes>();
  includedMap.set("CUST-XYZ-1", {
    name: "Carolina Ferrando",
    vatNumber: "27381112229",
    phone: "+5491133445566",
    email: "carolina.f@gmail.com",
  });

  const canonicalSale = FudoTranslator.toCanonicalSale(rawSale, includedMap);
  console.log(`  - ID Externo: ${canonicalSale.externalSaleId}`);
  console.log(`  - Proveedor: ${canonicalSale.provider}`);
  console.log(`  - Monto: $${canonicalSale.totalAmount}`);
  console.log(`  - Tipo normalizado: ${canonicalSale.saleType}`);
  console.log(`  - Estado: ${canonicalSale.status}`);
  console.log(`  - Comensal: ${canonicalSale.customer?.name} (DNI/CUIT: ${canonicalSale.customer?.documentNumber}, Tel: ${canonicalSale.customer?.phone})`);

  if (canonicalSale.externalSaleId !== "TEST-SALE-99") throw new Error("ID incorrecto");
  if (canonicalSale.totalAmount !== 45000.5) throw new Error("Monto incorrecto");
  if (canonicalSale.saleType !== "COUNTER") throw new Error("Tipo de venta no es COUNTER");
  if (canonicalSale.customer?.name !== "Carolina Ferrando") throw new Error("Cliente no mapeado");
  if (canonicalSale.customer?.documentNumber !== "27381112229") throw new Error("Documento no mapeado");
  console.log("  ✓ Venta traducida con éxito a modelo canónico.");

  // 3. Test: Traducción inversa de Cliente Canónico a Payload JSON:API de Fudo
  console.log("\n3. 👤 Verificando traducción inversa a payload JSON:API de Fudo:");
  const canonicalCustomerInput = {
    name: "Sebastián Romero",
    documentNumber: "34999888",
    phone: "+5491122334455",
    email: "seba.romero@hotmail.com",
    birthDate: "1990-05-18",
  };

  const fudoPayload = FudoTranslator.toFudoCustomerPayload(canonicalCustomerInput);
  if (fudoPayload.data.type !== "Customer") throw new Error("Tipo de JSON:API debe ser 'Customer'");
  if (fudoPayload.data.attributes.name !== "Sebastián Romero") throw new Error("Nombre no coincide");
  if (fudoPayload.data.attributes.vatNumber !== "34999888") throw new Error("vatNumber no coincide");
  console.log("  ✓ Payload JSON:API generado conforme a OpenAPI spec de Fudo.");

  // 4. Test: Traducción de Webhook entrante en tiempo real
  console.log("\n4. ⚡ Verificando traducción de Webhook en tiempo real:");
  const webhookPayload = {
    event: "sale.closed",
    data: {
      id: "WH-SALE-501",
      attributes: {
        total: 21500,
        closedAt: new Date().toISOString(),
        saleState: "CLOSED",
        saleType: "DELIVERY",
      },
    },
  };

  const canonicalEvent = FudoTranslator.toCanonicalEvent(webhookPayload);
  if (!canonicalEvent) throw new Error("Fallo al traducir webhook de venta");
  if (canonicalEvent.eventType !== "SALE_CLOSED") throw new Error("Tipo de evento no es SALE_CLOSED");
  if (canonicalEvent.sale?.externalSaleId !== "WH-SALE-501") throw new Error("ID de venta incorrecto");
  console.log(`  ✓ Evento Canónico generado: ${canonicalEvent.eventType} para venta #${canonicalEvent.sale?.externalSaleId}`);

  // 5. Test: Integración con FudoAdapter a través de PosGateway
  console.log("\n5. 🌐 Verificando PosGateway con FudoAdapter:");
  const providers = posGateway.getRegisteredProviders();
  console.log(`  - Proveedores registrados: ${providers.map((p) => p.displayName).join(", ")}`);
  if (!providers.some((p) => p.providerId === "FUDO")) throw new Error("Fudo no está registrado en PosGateway");

  const adapter = posGateway.getAdapter("FUDO");
  const testConn = await adapter.testConnection();
  console.log(`  - Test de conexión: ${testConn.success ? "ÉXITO" : "FALLO"} (${testConn.message})`);
  if (!testConn.success) throw new Error("Test de conexión con FudoAdapter falló");

  console.log("\n🎉 ¡TODAS LAS PRUEBAS DEL MÓDULO DE TRADUCCIÓN Y ADAPTADOR PASARON CON ÉXITO!");
  console.log("===============================================================");
}

runTranslatorTests().catch((err) => {
  console.error("❌ Error en tests de traducción:", err);
  process.exit(1);
});
