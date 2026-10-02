import { FudoRealtimeListener } from "../lib/pos/real-time/fudo-listener";
import { posEventBus } from "../lib/pos/real-time/event-bus";

async function main() {
  console.log("==================================================================");
  console.log("⚡🎧 GASTROBUMERAN - REAL-TIME POS LISTENER DAEMON (FUDO & APIS)");
  console.log("==================================================================");
  console.log("Escuchando eventos de comandas, ventas cerradas y anulaciones en vivo...\n");

  // Escuchar notificaciones en consola
  posEventBus.onNotification((notif) => {
    const time = new Date(notif.timestamp).toLocaleTimeString("es-AR");
    console.log(`[${time}] [${notif.type}] ${notif.message}`);
  });

  const listener = new FudoRealtimeListener({
    intervalMs: 3000, // Cada 3 segundos
    onError: (err) => {
      console.error("[Listener Error]:", err.message);
    },
  });

  // Manejo de salida limpia (Ctrl + C)
  process.on("SIGINT", () => {
    console.log("\nDeteniendo daemon...");
    listener.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    listener.stop();
    process.exit(0);
  });

  await listener.start();
}

main().catch(console.error);
