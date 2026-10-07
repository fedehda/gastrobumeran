"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  Crown,
  Sparkles,
  AlertTriangle,
  Moon,
  Download,
  Copy,
  Check,
  RefreshCw,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Search,
  Sliders,
  MessageCircle,
} from "lucide-react";
import {
  RfmSegmentationReport,
  RfmQuadrant,
} from "@/types/loyalty";

export function RfmIntelligenceView() {
  const [report, setReport] = useState<RfmSegmentationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cmvPercent, setCmvPercent] = useState<number>(32);
  const [selectedQuadrant, setSelectedQuadrant] = useState<RfmQuadrant | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [copiedPhones, setCopiedPhones] = useState(false);
  const [cronMessage, setCronMessage] = useState<string | null>(null);

  const fetchReport = async (cmv = cmvPercent) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics/rfm?cmv=${cmv}`);
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error("Error al cargar reporte RFM:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch(`/api/analytics/rfm?cmv=${cmvPercent}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && data.report) {
          setReport(data.report);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error al cargar reporte RFM:", err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [cmvPercent]);

  const handleRecalculateCron = async () => {
    setIsRecalculating(true);
    setCronMessage(null);
    try {
      const res = await fetch("/api/cron/rfm", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCronMessage("✓ Segmentación recalculada y registrada en bitácora de crons.");
        await fetchReport(cmvPercent);
      } else {
        setCronMessage("Error en recálculo: " + data.error);
      }
    } catch (err) {
      setCronMessage("Error de red al recalcular: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsRecalculating(false);
    }
  };

  // Filter customers for display
  const filteredCustomers = (report?.customers || []).filter((c) => {
    const matchesQuadrant = selectedQuadrant === "ALL" || c.quadrant === selectedQuadrant;
    const cleanSearch = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !cleanSearch ||
      c.name.toLowerCase().includes(cleanSearch) ||
      c.document_number.includes(cleanSearch) ||
      (c.phone && c.phone.includes(cleanSearch));
    return matchesQuadrant && matchesSearch;
  });

  // Copy phones to clipboard
  const handleCopyPhones = async () => {
    const phones = filteredCustomers
      .map((c) => c.phone)
      .filter((p): p is string => Boolean(p && p.trim()))
      .map((p) => p.replace(/\D/g, ""))
      .filter((p) => p.length >= 8);

    if (phones.length === 0) return;

    try {
      await navigator.clipboard.writeText(phones.join(", "));
      setCopiedPhones(true);
      setTimeout(() => setCopiedPhones(false), 2500);
    } catch (err) {
      console.error("Error al copiar teléfonos:", err);
    }
  };

  if (isLoading && !report) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-sm text-slate-500 dark:text-gray-400">Calculando segmentación RFM y pasivo contable...</p>
      </div>
    );
  }

  if (!report) return null;

  const { quadrants, liability } = report;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm dark:shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 shadow-inner">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Inteligencia de Clientes RFM & Control de Pasivo Contable
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Sprint H
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Segmentación predictiva por Recencia, Frecuencia y Monto para campañas de marketing sin saturación
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400" />
            <span className="text-slate-600 dark:text-gray-400">CMV Estimado:</span>
            <select
              value={cmvPercent}
              onChange={(e) => setCmvPercent(Number(e.target.value))}
              className="bg-transparent text-amber-600 dark:text-amber-400 font-bold outline-none cursor-pointer"
            >
              <option value="25" className="bg-white dark:bg-dark-900 text-slate-900 dark:text-white">25% (Alta Rentabilidad)</option>
              <option value="30" className="bg-white dark:bg-dark-900 text-slate-900 dark:text-white">30% (Promedio Resto)</option>
              <option value="32" className="bg-white dark:bg-dark-900 text-slate-900 dark:text-white">32% (Gastronómico Estándar)</option>
              <option value="35" className="bg-white dark:bg-dark-900 text-slate-900 dark:text-white">35% (Parrillas / Cortes)</option>
              <option value="40" className="bg-white dark:bg-dark-900 text-slate-900 dark:text-white">40% (Alto Costo)</option>
            </select>
          </div>

          <button
            onClick={handleRecalculateCron}
            disabled={isRecalculating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
            <span>{isRecalculating ? "Recalculando..." : "Recalcular RFM Ahora"}</span>
          </button>
        </div>
      </div>

      {/* Cron Feedback Alert */}
      {cronMessage && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-between animate-fade-in">
          <span>{cronMessage}</span>
          <button onClick={() => setCronMessage(null)} className="text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Section 1: Floating Points Liability (Pasivo Contable Flotante) */}
      <div className="rounded-2xl bg-white dark:bg-dark-900/90 border border-slate-200 dark:border-dark-800 p-5 shadow-sm dark:shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-dark-800 pb-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Control de Pasivo Contable Flotante (Puntos Circulantes vs CMV)
            </h4>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 dark:text-gray-400">Estado de Salud:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
                liability.health_status === "HEALTHY"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30"
                  : liability.health_status === "MODERATE"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30"
                  : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30"
              }`}
            >
              {liability.health_status === "HEALTHY" ? "✓ Saludable" : liability.health_status === "MODERATE" ? "⚠ Moderado" : "✕ Elevado"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Puntos Circulantes */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-950/70 border border-slate-200 dark:border-dark-800">
            <span className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1 font-medium">
              <span>Puntos Activos Circulantes</span>
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {liability.total_active_points.toLocaleString("es-AR")}
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400 ml-1">pts</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Valor facial en carta: <strong className="text-slate-700 dark:text-gray-200">${liability.nominal_catalog_value_ars.toLocaleString("es-AR")}</strong>
            </div>
          </div>

          {/* Card 2: Pasivo Real de Costo (CMV) */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-dark-950/70 border border-emerald-300 dark:border-emerald-500/30 shadow-inner">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold">
              <span>Pasivo Real en Costo (CMV {liability.cmv_percentage}%)</span>
            </span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              ${liability.real_cost_liability_ars.toLocaleString("es-AR")}
            </div>
            <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              Costo real de reposición si se canjearan todos los puntos
            </div>
          </div>

          {/* Card 3: Pasivo Extinguido por Anti-Inflación */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-950/70 border border-slate-200 dark:border-dark-800">
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ahorro Extinguido (Doble Timer)</span>
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ${liability.extinguished_anti_inflation_ars.toLocaleString("es-AR")}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              {liability.extinguished_anti_inflation_points.toLocaleString("es-AR")} pts caducados a costo $0 para el negocio
            </div>
          </div>

          {/* Card 4: Ratio sobre Facturación */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-950/70 border border-slate-200 dark:border-dark-800">
            <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
              Ratio Deuda / Facturación
            </span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {liability.liability_revenue_ratio_percent}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              {liability.health_label}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: 4 RFM Quadrants Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Champions */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === "CHAMPIONS" ? "ALL" : "CHAMPIONS")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-emerald-200 dark:from-emerald-950/60 dark:via-dark-900 dark:to-dark-950 dark:border-emerald-500/40 shadow-sm dark:shadow-none ${
            selectedQuadrant === "CHAMPIONS" ? "ring-2 ring-emerald-500 dark:ring-emerald-400 scale-[1.02]" : "hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{quadrants.CHAMPIONS.label}</h4>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                  {quadrants.CHAMPIONS.percentage_of_total}% de la base
                </span>
              </div>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{quadrants.CHAMPIONS.customer_count}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-gray-300 mt-3 line-clamp-2">{quadrants.CHAMPIONS.description}</p>
          <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-200 space-y-1">
            <div className="flex justify-between">
              <span>Facturación:</span>
              <strong className="text-slate-900 dark:text-white">${quadrants.CHAMPIONS.total_revenue.toLocaleString("es-AR")}</strong>
            </div>
            <div className="flex justify-between">
              <span>Puntos activos:</span>
              <strong className="text-slate-900 dark:text-white">{quadrants.CHAMPIONS.total_active_points.toLocaleString("es-AR")} pts</strong>
            </div>
          </div>
        </div>

        {/* Promising */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === "PROMISING" ? "ALL" : "PROMISING")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 bg-gradient-to-br from-sky-50 via-white to-sky-50/40 border-sky-200 dark:from-sky-950/60 dark:via-dark-900 dark:to-dark-950 dark:border-sky-500/40 shadow-sm dark:shadow-none ${
            selectedQuadrant === "PROMISING" ? "ring-2 ring-sky-500 dark:ring-sky-400 scale-[1.02]" : "hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{quadrants.PROMISING.label}</h4>
                <span className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold uppercase tracking-wider">
                  {quadrants.PROMISING.percentage_of_total}% de la base
                </span>
              </div>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{quadrants.PROMISING.customer_count}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-gray-300 mt-3 line-clamp-2">{quadrants.PROMISING.description}</p>
          <div className="mt-4 pt-3 border-t border-sky-200 dark:border-sky-500/20 text-[11px] text-sky-800 dark:text-sky-200 space-y-1">
            <div className="flex justify-between">
              <span>Facturación:</span>
              <strong className="text-slate-900 dark:text-white">${quadrants.PROMISING.total_revenue.toLocaleString("es-AR")}</strong>
            </div>
            <div className="flex justify-between">
              <span>Puntos activos:</span>
              <strong className="text-slate-900 dark:text-white">{quadrants.PROMISING.total_active_points.toLocaleString("es-AR")} pts</strong>
            </div>
          </div>
        </div>

        {/* At Risk */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === "AT_RISK" ? "ALL" : "AT_RISK")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 border-amber-200 dark:from-amber-950/60 dark:via-dark-900 dark:to-dark-950 dark:border-amber-500/40 shadow-sm dark:shadow-none ${
            selectedQuadrant === "AT_RISK" ? "ring-2 ring-amber-500 dark:ring-amber-400 scale-[1.02]" : "hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{quadrants.AT_RISK.label}</h4>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">
                  {quadrants.AT_RISK.percentage_of_total}% de la base
                </span>
              </div>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{quadrants.AT_RISK.customer_count}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-gray-300 mt-3 line-clamp-2">{quadrants.AT_RISK.description}</p>
          <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
            <div className="flex justify-between">
              <span>Facturación:</span>
              <strong className="text-slate-900 dark:text-white">${quadrants.AT_RISK.total_revenue.toLocaleString("es-AR")}</strong>
            </div>
            <div className="flex justify-between">
              <span>Puntos activos:</span>
              <strong className="text-slate-900 dark:text-white">{quadrants.AT_RISK.total_active_points.toLocaleString("es-AR")} pts</strong>
            </div>
          </div>
        </div>

        {/* Dormant */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === "DORMANT" ? "ALL" : "DORMANT")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 border-rose-200 dark:from-rose-950/60 dark:via-dark-900 dark:to-dark-950 dark:border-rose-500/40 shadow-sm dark:shadow-none ${
            selectedQuadrant === "DORMANT" ? "ring-2 ring-rose-500 dark:ring-rose-400 scale-[1.02]" : "hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{quadrants.DORMANT.label}</h4>
                <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold uppercase tracking-wider">
                  {quadrants.DORMANT.percentage_of_total}% de la base
                </span>
              </div>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{quadrants.DORMANT.customer_count}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-gray-300 mt-3 line-clamp-2">{quadrants.DORMANT.description}</p>
          <div className="mt-4 pt-3 border-t border-rose-200 dark:border-rose-500/20 text-[11px] text-rose-800 dark:text-rose-200 space-y-1">
            <div className="flex justify-between">
              <span>Facturación:</span>
              <strong className="text-slate-900 dark:text-white">${quadrants.DORMANT.total_revenue.toLocaleString("es-AR")}</strong>
            </div>
            <div className="flex justify-between">
              <span>Puntos activos:</span>
              <strong className="text-slate-900 dark:text-white">{quadrants.DORMANT.total_active_points.toLocaleString("es-AR")} pts</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Surgical Export & Filter Controls */}
      <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm dark:shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Segmentación Quirúrgica & Exportación de Campañas
            </h4>
          </div>

          {/* Action buttons: Download CSV & Copy Phones */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPhones}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-dark-700 text-xs font-semibold transition"
              title="Copiar teléfonos filtrados separados por comas para listas de difusión"
            >
              {copiedPhones ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400" />
              )}
              <span>{copiedPhones ? "¡Teléfonos Copiados!" : "Copiar Teléfonos"}</span>
            </button>

            <a
              href={`/api/analytics/rfm/export?quadrant=${selectedQuadrant}`}
              download
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-glow"
              title="Descargar archivo CSV compatible con Excel y Meta Custom Audiences"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV ({filteredCustomers.length})</span>
            </a>
          </div>
        </div>

        {/* Filter Pills and Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Quadrant filter tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedQuadrant("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedQuadrant === "ALL"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-dark-800"
              }`}
            >
              Todos ({report.customers.length})
            </button>
            <button
              onClick={() => setSelectedQuadrant("CHAMPIONS")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedQuadrant === "CHAMPIONS"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-dark-800"
              }`}
            >
              Champions ({quadrants.CHAMPIONS.customer_count})
            </button>
            <button
              onClick={() => setSelectedQuadrant("PROMISING")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedQuadrant === "PROMISING"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-dark-800"
              }`}
            >
              Prometedores ({quadrants.PROMISING.customer_count})
            </button>
            <button
              onClick={() => setSelectedQuadrant("AT_RISK")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedQuadrant === "AT_RISK"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-dark-800"
              }`}
            >
              En Riesgo ({quadrants.AT_RISK.customer_count})
            </button>
            <button
              onClick={() => setSelectedQuadrant("DORMANT")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedQuadrant === "DORMANT"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-dark-800"
              }`}
            >
              Dormidos ({quadrants.DORMANT.customer_count})
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar comensal o DNI..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 focus:border-purple-500 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none transition"
            />
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-950/60 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-dark-950 text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-dark-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Comensal</th>
                <th className="py-3 px-4 font-semibold">Cuadrante RFM</th>
                <th className="py-3 px-4 font-semibold text-center">Recencia</th>
                <th className="py-3 px-4 font-semibold text-center">Frecuencia</th>
                <th className="py-3 px-4 font-semibold text-right">Gasto Total</th>
                <th className="py-3 px-4 font-semibold text-right">Puntos</th>
                <th className="py-3 px-4 font-semibold">Estrategia Recomendada</th>
                <th className="py-3 px-4 font-semibold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-gray-500">
                    No se encontraron comensales para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const cleanPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
                  const waUrl = cleanPhone
                    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(c.whatsapp_suggested_message)}`
                    : null;

                  return (
                    <tr key={c.customer_id} className="hover:bg-slate-50 dark:hover:bg-dark-800/40 transition">
                      {/* Name & DNI */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">DNI: {c.document_number}</div>
                      </td>

                      {/* Quadrant Badge */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.badge_color}`}>
                          {c.quadrant_label}
                        </span>
                      </td>

                      {/* Recency */}
                      <td className="py-3 px-4 text-center">
                        <span className={`font-semibold ${c.recency_days <= 30 ? "text-emerald-600 dark:text-emerald-400" : c.recency_days <= 60 ? "text-sky-600 dark:text-sky-400" : c.recency_days <= 90 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {c.recency_days === 999 ? "Nunca" : `hace ${c.recency_days}d`}
                        </span>
                      </td>

                      {/* Frequency */}
                      <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-gray-200">
                        {c.frequency_visits} vis.
                      </td>

                      {/* Monetary */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ${c.monetary_spent.toLocaleString("es-AR")}
                      </td>

                      {/* Points */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-300">
                        {c.points_balance.toLocaleString("es-AR")}
                      </td>

                      {/* Strategy */}
                      <td className="py-3 px-4 text-slate-600 dark:text-gray-300 max-w-xs text-[11px]">
                        {c.actionable_recommendation}
                      </td>

                      {/* WhatsApp Button */}
                      <td className="py-3 px-4 text-center">
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 text-[11px] font-bold transition"
                            title="Enviar mensaje sugerido por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-gray-600">Sin tel</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
