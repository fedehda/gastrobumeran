import { posEventBus, PosRealtimeNotification } from "../lib/pos/real-time/event-bus";
import { PosWebhookHandler } from "../lib/pos/real-time/webhook-handler";
import { FudoRealtimeListener } from "../lib/pos/real-time/fudo-listener";
import { getDatabase } from "../lib/db/db";
import { createCustomer, findCustomerByDocument } from "../lib/db/customer-repo";

async function runRealtimeTests() {
  console.log("===============================================================");
  console.log("⚡ TEST: LISTENER EN TIEMPO REAL & PROCESADOR DE WEBHOOKS");
  console.log("===============================================================\n");

  // 1. Test: Event Bus de notificaciones reactivas
  console.log("1. 📢 Probando PosEventBus de notificaciones:");
  let receivedNotification: PosRealtimeNotification | null = null;

  const unsubscribe = posEventBus.onNotification((notif) => {
    receivedNotification = notif;
  });

  posEventBus.emitNotification({
    id: "notif-test-1",
    type: "SALE_INGESTED",
    provider: "FUDO",
    timestamp: new Date().toISOString(),
    pointsEarned: 150,
    totalAmount: 15000,
    customerName: "Mariano Gourmet",
    message: "¡Venta procesada en tiempo real!",
  });

  if (!receivedNotification) throw new Error("No se recibió la notificación en el Event Bus");
  console.log(`  ✓ Notificación capturada: "${(receivedNotification as PosRealtimeNotification).message}"`);
  unsubscribe();

  // 2. Test: Procesamiento de Webhook entrante
  console.log("\n2. 🪝 Probando Webhook Ingestion Handler con venta en vivo:");
  // Asegurar que exista un cliente para asociar la venta
  const testDni = "40999888";
  let cust = findCustomerByDocument(testDni);
  if (!cust) {
    cust = createCustomer({
      document_number: testDni,
      name: "Cliente Webhook Test",
      phone: "+5491177665544",
    });
  }

  const simulatedWebhook = {
    event: "sale.closed",
    data: {
      id: `WH-TEST-${Date.now()}`,
      attributes: {
        total: 28500.0,
        closedAt: new Date().toISOString(),
        saleState: "CLOSED",
        saleType: "TABLE",
        vatNumber: testDni,
      },
    },
  };

  const webhookResult = await PosWebhookHandler.handleIncomingWebhook(
    "FUDO",
    simulatedWebhook,
    { "content-type": "application/json" }
  );

  console.log(`  - Resultado Webhook: HTTP ${webhookResult.statusCode} (${webhookResult.message})`);
  if (!webhookResult.success) {
    throw new Error(`Fallo en procesamiento de Webhook: ${webhookResult.message}`);
  }
  console.log("  ✓ Webhook recibido, traducido e ingerido atómicamente.");

  // 3. Test: Fudo Real-Time Listener Worker
  console.log("\n3. 🎧 Probando servicio FudoRealtimeListener:");
  const listener = new FudoRealtimeListener({
    intervalMs: 1500,
  });

  const status = listener.getStatus();
  console.log(`  - Estado inicial: isRunning = ${status.isRunning}`);
  if (status.isRunning) throw new Error("No debería estar corriendo antes de start()");

  // Iniciar listener
  await listener.start();
  const activeStatus = listener.getStatus();
  console.log(`  - Estado activo: isRunning = ${activeStatus.isRunning}`);
  if (!activeStatus.isRunning) throw new Error("Debería estar corriendo tras start()");

  // Esperar un ciclo breve
  await new Promise((r) => setTimeout(r, 1000));

  // Detener listener
  listener.stop();
  const stoppedStatus = listener.getStatus();
  console.log(`  - Estado detenido: isRunning = ${stoppedStatus.isRunning}`);
  if (stoppedStatus.isRunning) throw new Error("Debería haberse detenido tras stop()");

  console.log("\n🎉 ¡TODAS LAS PRUEBAS DE TIEMPO REAL Y LISTENER PASARON CON ÉXITO!");
  console.log("===============================================================");
}

runRealtimeTests().catch((err) => {
  console.error("❌ Error en tests de tiempo real:", err);
  process.exit(1);
});
