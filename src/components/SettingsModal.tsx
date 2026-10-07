"use client";

import React, { useState } from "react";
import { Sliders, X, Check, ShieldCheck, AlertCircle, Gift } from "lucide-react";
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
  const [allowVisitTable, setAllowVisitTable] = useState(
    settings.allow_visit_table !== undefined ? settings.allow_visit_table : true
  );
  const [allowVisitCounter, setAllowVisitCounter] = useState(
    settings.allow_visit_counter !== undefined ? settings.allow_visit_counter : false
  );
  const [allowVisitDelivery, setAllowVisitDelivery] = useState(
    settings.allow_visit_delivery !== undefined ? settings.allow_visit_delivery : false
  );
  const [welcomePointsEnabled, setWelcomePointsEnabled] = useState(
    settings.welcome_points_enabled !== undefined ? settings.welcome_points_enabled : false
  );
  const [welcomePointsAmount, setWelcomePointsAmount] = useState(
    settings.welcome_points_amount || 0
  );
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
          allow_visit_table: Boolean(allowVisitTable),
          allow_visit_counter: Boolean(allowVisitCounter),
          allow_visit_delivery: Boolean(allowVisitDelivery),
          welcome_points_enabled: Boolean(welcomePointsEnabled),
          welcome_points_amount: Number(welcomePointsAmount),
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
      <div className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-dark-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-750 flex items-center justify-center text-bumeran-600 dark:text-bumeran-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Reglas & Parámetros (Backoffice)</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">Configuración dinámica del modelo dual</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
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
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
              />
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 dark:text-gray-500 pointer-events-none">
                Ej: $100 = 1 pt
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
                />
                <span className="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] text-slate-400 dark:text-gray-500 pointer-events-none">
                  días
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
                />
                <span className="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] text-slate-400 dark:text-gray-500 pointer-events-none">
                  días
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
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
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
              />
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 dark:text-gray-500 pointer-events-none">
                Default: $1.500
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
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
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
              />
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 dark:text-gray-500 pointer-events-none">
                Default: 18 horas
              </span>
            </div>
          </div>

          {/* Sectores y Puntos de Venta que Suman Sellos de Visita */}
          <div className="pt-3 border-t border-slate-200 dark:border-dark-800 space-y-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white">
                Sectores que Suman Sellos de Visita
              </label>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">
                Seleccioná qué canales computan sellos de visita al superar el ticket mínimo (los puntos por consumo siempre se acreditan).
              </p>
            </div>

            {/* Toggle 1: Salón / Mesas */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-750 transition-colors">
              <div className="flex items-center space-x-2.5">
                <span className="text-base">🍽️</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">Mesa / Salón Principal</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        allowVisitTable ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-dark-800 text-slate-500 dark:text-gray-500"
                      }`}
                    >
                      {allowVisitTable ? "Suma Visitas" : "Solo Puntos"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400">Consumos presenciales en mesa o barra</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllowVisitTable(!allowVisitTable)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allowVisitTable ? "bg-bumeran-500" : "bg-slate-300 dark:bg-dark-750"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    allowVisitTable ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Mostrador / Take Away */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-750 transition-colors">
              <div className="flex items-center space-x-2.5">
                <span className="text-base">🛍️</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">Take Away / Mostrador</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        allowVisitCounter ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-dark-800 text-slate-500 dark:text-gray-500"
                      }`}
                    >
                      {allowVisitCounter ? "Suma Visitas" : "Solo Puntos"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400">Pedidos para llevar despachados en mostrador</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllowVisitCounter(!allowVisitCounter)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allowVisitCounter ? "bg-bumeran-500" : "bg-slate-300 dark:bg-dark-750"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    allowVisitCounter ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Pedidos Delivery */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-750 transition-colors">
              <div className="flex items-center space-x-2.5">
                <span className="text-base">🛵</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">Pedidos Delivery</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        allowVisitDelivery ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-dark-800 text-slate-500 dark:text-gray-500"
                      }`}
                    >
                      {allowVisitDelivery ? "Suma Visitas" : "Solo Puntos"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400">Envíos a domicilio directos o por apps</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllowVisitDelivery(!allowVisitDelivery)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allowVisitDelivery ? "bg-bumeran-500" : "bg-slate-300 dark:bg-dark-750"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    allowVisitDelivery ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Puntos de Bienvenida (Incentivo de Registro) */}
          <div className="pt-2 border-t border-slate-200 dark:border-dark-800 space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-750 transition-colors">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-bumeran-500/10 border border-bumeran-500/20 flex items-center justify-center text-bumeran-500 dark:text-bumeran-400">
                  <Gift className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">Puntos de Bienvenida</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        welcomePointsEnabled ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-dark-800 text-slate-500 dark:text-gray-500"
                      }`}
                    >
                      {welcomePointsEnabled ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400">Bonificación al afiliarse por primera vez</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWelcomePointsEnabled(!welcomePointsEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  welcomePointsEnabled ? "bg-bumeran-500" : "bg-slate-300 dark:bg-dark-750"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    welcomePointsEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {welcomePointsEnabled && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950/80 border border-slate-200 dark:border-dark-800 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                  Cantidad de Puntos de Bienvenida
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required={welcomePointsEnabled}
                    value={welcomePointsAmount}
                    onChange={(e) => setWelcomePointsAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
                    placeholder="Ej: 50"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs text-slate-400 dark:text-gray-500">
                    pts
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-gray-400">
                  Se acreditan una única vez al registrar o adherir a un comensal al programa.
                </p>
              </div>
            )}
          </div>

          {msg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                msg.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-400"
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
              className="w-1/2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:hover:bg-dark-750 dark:text-gray-300 border border-slate-200 dark:border-transparent text-xs font-semibold transition-colors"
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
