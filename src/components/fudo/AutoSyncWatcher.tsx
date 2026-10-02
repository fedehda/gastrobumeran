"use client";

import { useEffect, useRef } from "react";

/**
 * AutoSyncWatcher: Componente cliente que asegura la sincronización periódica en segundo plano
 * mientras GastroBumeran se encuentra abierto en el navegador (en la caja o computadora de salón).
 * Realiza un heartbeat cada 60 segundos y al recuperar el foco de la ventana.
 */
export function AutoSyncWatcher() {
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const triggerSyncCheck = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const res = await fetch("/api/cron/fudo-sync", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          const data = await res.json();
          // If sales or customers were synchronized, notify open views
          if (data.result && (data.result.syncedCount > 0 || data.result.newCustomersCount > 0)) {
            window.dispatchEvent(
              new CustomEvent("gastrobumeran:sync-completed", {
                detail: data.result,
              })
            );
          }
        }
      } catch {
        // Silent catch for offline or network glitches
      } finally {
        isCheckingRef.current = false;
      }
    };

    // 1. Initial check after 15 seconds
    const initialTimer = setTimeout(triggerSyncCheck, 15 * 1000);

    // 2. Periodic polling every 60 seconds
    const intervalTimer = setInterval(triggerSyncCheck, 60 * 1000);

    // 3. Trigger check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerSyncCheck();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Conexión en tiempo real vía Server-Sent Events (SSE)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/pos/realtime/stream");
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type && payload.type !== "CONNECTED") {
            window.dispatchEvent(
              new CustomEvent("gastrobumeran:sync-completed", {
                detail: payload,
              })
            );
          }
        } catch {
          // ignore non-json pings
        }
      };
    } catch {
      // Fallback a polling normal
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return null;
}
