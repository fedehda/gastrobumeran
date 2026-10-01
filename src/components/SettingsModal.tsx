"use client";

import React, { useState } from "react";
import { Sliders, X, Check, ShieldCheck, AlertCircle } from "lucide-react";
import { LoyaltySettings } from "@/types/loyalty";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LoyaltySettings;
  onSettingsUpdated: (updated: LoyaltySettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated,
}: SettingsModalProps) {
  const [pointsRate, setPointsRate] = useState(settings.points_earning_rate);
  const [expirationDays, setExpirationDays] = useState(settings.points_expiration_days);
  const [lifetimeDays, setLifetimeDays] = useState(settings.points_lifetime_days || 365);
  const [minSpend, setMinSpend] = useState(settings.min_spend_for_visit);
  const [cooldownHours, setCooldownHours] = useState(settings.visit_cooldown_hours);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points_earning_rate: Number(pointsRate),
          points_expiration_days: Number(expirationDays),
          points_lifetime_days: Number(lifetimeDays),
          min_spend_for_visit: Number(minSpend),
          visit_cooldown_hours: Number(cooldownHours),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al actualizar configuración");
      }

      onSettingsUpdated(data.settings);
      setMsg({ type: "success", text: "Reglas de fidelización actualizadas con éxito." });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Error al guardar" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="max-w-md w-full rounded-2xl bg-dark-900 border border-dark-750 p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-dark-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-750 flex items-center justify-center text-bumeran-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reglas & Parámetros (Backoffice)</h3>
              <p className="text-xs text-gray-400">Configuración dinámica del modelo dual</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Tasa de Conversión de Puntos ($ gastados por cada 1 punto)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                required
                value={pointsRate}
                onChange={(e) => setPointsRate(parseFloat(e.target.value) || 1)}
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
              />
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-gray-500 pointer-events-none">
                Ej: $100 = 1 pt
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Timer 1: Inactividad
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="7"
                  max="365"
                  step="1"
                  required
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value, 10) || 90)}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
                />
                <span className="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] text-gray-500 pointer-events-none">
                  días
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Timer 2: Lote FIFO Máx
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="30"
                  max="1000"
                  step="1"
                  required
                  value={lifetimeDays}
                  onChange={(e) => setLifetimeDays(parseInt(e.target.value, 10) || 365)}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
                />
                <span className="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] text-gray-500 pointer-events-none">
                  días
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Ticket Mínimo para Computar Visita ($)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="50"
                required
                value={minSpend}
                onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
              />
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-gray-500 pointer-events-none">
                Default: $1.500
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Cooldown Antifraude de Visita (Horas)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="72"
                step="1"
                required
                value={cooldownHours}
                onChange={(e) => setCooldownHours(parseInt(e.target.value, 10) || 18)}
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
              />
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-gray-500 pointer-events-none">
                Default: 18 horas
              </span>
            </div>
          </div>

          {msg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                msg.type === "success"
                  ? "bg-emerald-950/40 border border-emerald-500/40 text-emerald-400"
                  : "bg-red-950/40 border border-red-500/40 text-red-400"
              }`}
            >
              {msg.type === "success" ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-glow flex items-center justify-center space-x-1.5"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Parámetros</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
