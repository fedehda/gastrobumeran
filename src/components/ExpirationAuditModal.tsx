"use client";

import React, { useState } from "react";
import { Flame, X, RefreshCw, AlertTriangle, ShieldCheck, MessageCircle, Award } from "lucide-react";
import { Customer } from "@/types/loyalty";

interface ExpirationAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditResultData {
  inactivityExpiredCount: number;
  inactivityPointsExpired: number;
  batchesExpiredCount: number;
  batchesPointsExpired: number;
  totalPointsExpired: number;
  day75Alerts: Customer[];
}

export function ExpirationAuditModal({ isOpen, onClose }: ExpirationAuditModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResultData | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAudit = async () => {
    setIsRunning(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/cron/expiration", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al ejecutar la auditoría");
      }

      setAuditResult(data.result);
      setStatusMessage(data.message);
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : "Error al ejecutar auditoría");
    } finally {
      setIsRunning(false);
    }
  };

  const getDaysLeft = (expireAt?: string | null) => {
    if (!expireAt) return 0;
    const diff = new Date(expireAt).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
      <div className="max-w-2xl w-full rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-dark-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Auditoría Dual: Inactividad 90d + Lotes FIFO 365d</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">Depuración automática nocturna (Cron 03:00 AM)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 mb-4 text-xs text-slate-600 dark:text-gray-300 space-y-1.5">
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Mecánica del Sistema Dual Anti-Inflación</span>
          </div>
          <p className="text-slate-600 dark:text-gray-400">
            • <strong>Timer 1 (Inactividad 90 días):</strong> Si el cliente no consume en 90 días, su saldo se resetea a 0. Cada compra renueva esta ventana.
            <br />
            • <strong>Timer 2 (Lote FIFO 365 días):</strong> Los puntos tienen una vida máxima anual. Aunque el cliente asista seguido, lotes con más de un año caducan.
            <br />
            • <strong>Alerta Día 75 (Ventana de 15 días):</strong> Detecta comensales en riesgo para reactivación vía WhatsApp antes de perder puntos.
          </p>
        </div>

        {/* Action Trigger */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-dark-950/70 border border-slate-200 dark:border-dark-750 mb-4">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Ejecutar Simulación de Depuración Nocturna</div>
            <div className="text-xs text-slate-500 dark:text-gray-400">Audita inactividades, lotes vencidos y genera alertas Día 75</div>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-bumeran-600 hover:from-amber-500 hover:to-bumeran-500 text-white text-xs font-bold transition-all shadow-glow-gold flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
            <span>{isRunning ? "Auditando..." : "Ejecutar Auditoría"}</span>
          </button>
        </div>

        {statusMessage && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-dark-950 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
            {statusMessage}
          </div>
        )}

        {/* Audit Results */}
        {auditResult && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-center">
                <div className="text-lg font-bold text-slate-900 dark:text-white">{auditResult.inactivityExpiredCount}</div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400">Cuentas Inactivas (+90d)</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-center">
                <div className="text-lg font-bold text-slate-900 dark:text-white">{auditResult.batchesExpiredCount}</div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400">Lotes Anuales (+365d)</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-center">
                <div className="text-lg font-bold text-red-500 dark:text-red-400">{auditResult.totalPointsExpired} pts</div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400">Puntos Depurados</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-dark-950 border border-amber-200 dark:border-amber-500/30 text-center">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{auditResult.day75Alerts.length}</div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Alertas Día 75</div>
              </div>
            </div>

            {/* List of day 75 alerts */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500 dark:text-amber-400" />
                Comensales para Campaña de Reactivación WhatsApp ({auditResult.day75Alerts.length})
              </h4>

              {auditResult.day75Alerts.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 dark:text-gray-500 bg-slate-50 dark:bg-dark-950/50 rounded-xl border border-slate-200 dark:border-dark-800">
                  Ningún comensal se encuentra en la ventana crítica de vencimiento (75-90 días).
                </div>
              ) : (
                <div className="space-y-2">
                  {auditResult.day75Alerts.map((c) => {
                    const daysLeft = getDaysLeft(c.points_expire_at);
                    const waMessage = encodeURIComponent(
                      `¡Hola ${c.name}! Te extrañamos en el restaurante. Tienes ${c.points_balance} puntos acumulados que vencen en ${daysLeft} días. ¡Vení esta semana y usalos en tu próxima comida!`
                    );
                    const waLink = c.phone ? `https://wa.me/${c.phone.replace(/[^0-9]/g, "")}?text=${waMessage}` : null;

                    return (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-white dark:bg-dark-950 border border-amber-300 dark:border-amber-500/20 flex items-center justify-between hover:border-amber-500/50 transition-all shadow-sm"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 dark:text-white text-xs">{c.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              {daysLeft} días restantes
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5 flex items-center space-x-3">
                            <span>DNI: {c.document_number}</span>
                            <span className="text-bumeran-600 dark:text-bumeran-400 font-medium flex items-center">
                              <Award className="w-3 h-3 mr-0.5" /> {c.points_balance} pts en riesgo
                            </span>
                            {c.phone && <span>Tel: {c.phone}</span>}
                          </div>
                        </div>

                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-gray-500 italic">Sin teléfono</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-dark-800 mt-auto flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-slate-700 dark:text-gray-300 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
