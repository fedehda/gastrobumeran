"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Flame,
  RefreshCw,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  Zap,
  BarChart3,
  MessageCircle,
  Sparkles,
  Receipt,
  FileSpreadsheet,
  Brain,
  RotateCcw,
  Palette,
} from "lucide-react";
import { BackofficeAnalytics } from "@/types/loyalty";
import { RewardsManager } from "@/components/rewards/RewardsManager";
import { RfmIntelligenceView } from "./RfmIntelligenceView";
import { TestEnvironmentManager } from "./TestEnvironmentManager";
import { CardBrandingManager } from "@/components/branding/CardBrandingManager";

interface BackofficeDashboardProps {
  onOpenFudoModal?: () => void;
  onDataPurged?: () => void;
}

export function BackofficeDashboard({ onOpenFudoModal, onDataPurged }: BackofficeDashboardProps = {}) {
  const [analytics, setAnalytics] = useState<BackofficeAnalytics | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [activeTab, setActiveTab] = useState<"analytics" | "rewards" | "rfm" | "branding" | "maintenance">("analytics");
  const [isLoading, setIsLoading] = useState(true);
  const [isExecutingCron, setIsExecutingCron] = useState(false);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  const fetchAnalytics = async (selectedRange = range) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${selectedRange}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAnalytics(data.analytics);
        }
      }
    } catch (err) {
      console.error("Error al cargar analítica:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch(`/api/analytics?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setAnalytics(data.analytics);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error al cargar analítica:", err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [range]);

  const handleRunExpirationCron = async () => {
    setIsExecutingCron(true);
    setCronFeedback(null);
    try {
      const res = await fetch("/api/cron/expiration", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCronFeedback(data.message);
        await fetchAnalytics(range);
      } else {
        setCronFeedback("Error al ejecutar auditoría: " + data.error);
      }
    } catch (err) {
      setCronFeedback("Error de red al ejecutar auditoría: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExecutingCron(false);
    }
  };

  const generateWhatsAppUrl = (phone: string | null | undefined, name: string, points: number) => {
    if (!phone) return "#";
    const cleanPhone = phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `¡Hola ${name}! 🍽️ Te escribimos de GastroBumeran para avisarte que tenés ${points} puntos acumulados próximos a vencer por inactividad. ¡Vení a disfrutarlos en tu próxima visita o canjealos por postres y platos de la casa! Te esperamos.`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  if (isLoading && !analytics) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-bumeran-500" />
        <p className="text-sm text-gray-400 font-medium">Calculando métricas y análisis de fidelización...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="py-12 text-center text-gray-400">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <p>No se pudieron cargar las analíticas del backoffice.</p>
        <button
          onClick={() => fetchAnalytics(range)}
          className="mt-4 px-4 py-2 bg-dark-800 text-white rounded-lg text-xs"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { kpis, ingestionChannels, cohorts, topCustomers, topRewards, churnRisk, recentCrons } = analytics;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-bumeran-500/10 border border-bumeran-500/20 text-bumeran-500 dark:text-bumeran-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Tablero Analítico de Fidelización & Backoffice
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Business Intelligence, retención de comensales y rendimiento anti-inflacionario
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range buttons */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-dark-950 p-1 border border-slate-200 dark:border-dark-800">
            {(
              [
                { id: "7d", label: "7 días" },
                { id: "30d", label: "30 días" },
                { id: "90d", label: "90 días" },
                { id: "all", label: "Histórico" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setRange(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === t.id
                    ? "bg-bumeran-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchAnalytics(range)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:hover:bg-dark-700 dark:text-gray-300 dark:hover:text-white border border-slate-200 dark:border-dark-700 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-bumeran-500 dark:text-bumeran-400" : ""}`} />
          </button>

          {/* Trigger Cron button */}
          <button
            onClick={handleRunExpirationCron}
            disabled={isExecutingCron}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-300 text-xs font-semibold transition-all"
          >
            <Clock className={`w-3.5 h-3.5 ${isExecutingCron ? "animate-spin" : ""}`} />
            <span>{isExecutingCron ? "Auditoría en curso..." : "Ejecutar Cron 03:00"}</span>
          </button>
        </div>
      </div>

      {/* Backoffice Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-dark-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "analytics"
              ? "bg-bumeran-600 text-white shadow-glow"
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 dark:text-gray-400 dark:hover:text-white dark:bg-dark-900 dark:border-dark-800"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Métricas & Business Intelligence</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rewards")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "rewards"
              ? "bg-bumeran-600 text-white shadow-glow"
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 dark:text-gray-400 dark:hover:text-white dark:bg-dark-900 dark:border-dark-800"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Gestión de Premios & Canjes (CRUD)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rfm")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "rfm"
              ? "bg-purple-600 text-white shadow-glow"
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 dark:text-gray-400 dark:hover:text-white dark:bg-dark-900 dark:border-dark-800"
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span>Inteligencia RFM & Pasivo Contable</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("branding")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "branding"
              ? "bg-bumeran-600 text-white shadow-glow"
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 dark:text-gray-400 dark:hover:text-white dark:bg-dark-900 dark:border-dark-800"
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-bumeran-400" />
          <span>Personalización de Tarjeta & Marca</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("maintenance")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "maintenance"
              ? "bg-amber-600 text-white shadow-glow"
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 dark:text-gray-400 dark:hover:text-white dark:bg-dark-900 dark:border-dark-800"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
          <span>Entorno de Prueba & Lanzamiento</span>
        </button>
      </div>

      {activeTab === "maintenance" ? (
        <TestEnvironmentManager
          onOpenFudoModal={onOpenFudoModal}
          onDataPurged={() => {
            fetchAnalytics(range);
            if (onDataPurged) onDataPurged();
          }}
        />
      ) : activeTab === "branding" ? (
        <CardBrandingManager />
      ) : activeTab === "rfm" ? (
        <RfmIntelligenceView />
      ) : activeTab === "rewards" ? (
        <RewardsManager />
      ) : (
        <>
          {/* Cron Feedback Banner */}
      {cronFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{cronFeedback}</span>
        </div>
      )}

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Retention Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tasa de Retención</span>
            <Users className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{kpis.retentionRatePercent}%</div>
          <div className="mt-2 flex items-center text-xs text-slate-500 dark:text-gray-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold mr-1.5">
              {cohorts.occasionalCount + cohorts.frequentCount + cohorts.vipCount} recurrentes
            </span>
            <span>de {kpis.totalCustomers} clientes totales</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-dark-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, kpis.retentionRatePercent)}%` }}
            />
          </div>
        </div>

        {/* Total Revenue & Avg Ticket */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Facturación Fidelizada</span>
            <DollarSign className="w-4 h-4 text-bumeran-500 dark:text-bumeran-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ${kpis.totalRevenue.toLocaleString("es-AR")}
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500 dark:text-gray-400">
            <span>Ticket Promedio: </span>
            <span className="text-bumeran-600 dark:text-bumeran-400 font-semibold ml-1">
              ${kpis.averageTicket.toLocaleString("es-AR")}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 dark:text-gray-500">
            Volumen comercial capturado en el período
          </div>
        </div>

        {/* Burn Rate / Redemption */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tasa de Redención</span>
            <TrendingUp className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.pointsRedemptionRatePercent}%
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500 dark:text-gray-400">
            <span className="text-sky-600 dark:text-sky-400 font-semibold mr-1">{kpis.totalPointsRedeemed} pts</span>
            <span>canjeados de {kpis.totalPointsIssued} emitidos</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-dark-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, kpis.pointsRedemptionRatePercent)}%` }}
            />
          </div>
        </div>

        {/* Anti-Inflation Contingent Protection */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white to-amber-50/50 dark:from-dark-900 dark:to-amber-950/20 border border-amber-200 dark:border-amber-500/20 shadow-lg">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400/80 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Ahorro Anti-Inflación</span>
            <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300">
            {kpis.antiInflationSavingsPoints} pts
          </div>
          <div className="mt-2 text-xs text-slate-600 dark:text-gray-300">
            Ahorro estimado:{" "}
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              ${kpis.antiInflationSavingsEstimatedArs.toLocaleString("es-AR")}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-gray-400">
            Pasivo activo: <span className="text-slate-900 dark:text-white font-mono">{kpis.currentActivePointsLiability} pts</span>
          </div>
        </div>
      </div>

      {/* Row 2: Ingestion Channels & Frequency Cohorts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ingestion Channels (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-dark-800">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-bumeran-500 dark:text-bumeran-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Canales de Ingesta de Ventas</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-gray-400">Distribución de facturación</span>
          </div>

          <div className="space-y-4">
            {ingestionChannels.map((channel) => (
              <div key={channel.source} className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-950/60 border border-slate-200 dark:border-dark-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {channel.source === "FUDO_API" ? (
                      <Zap className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    ) : channel.source === "CSV_IMPORT" ? (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <Receipt className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    )}
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{channel.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-gray-200">
                    ${channel.totalRevenue.toLocaleString("es-AR")} ({channel.percentageRevenue}%)
                  </span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-dark-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      channel.source === "FUDO_API"
                        ? "bg-sky-500"
                        : channel.source === "CSV_IMPORT"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.max(2, channel.percentageRevenue)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-500 dark:text-gray-400">
                  <span>{channel.salesCount} tickets procesados</span>
                  <span>~{channel.totalPoints} puntos emitidos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cohort Pyramid (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-dark-800">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pirámide de Frecuencia (Cohortes)</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-gray-400">{cohorts.totalCustomers} comensales</span>
          </div>

          <div className="space-y-3">
            {[
              {
                label: "Comensales VIP (10+ visitas)",
                count: cohorts.vipCount,
                color: "bg-purple-500",
                textColor: "text-purple-600 dark:text-purple-400",
                badge: "VIP Club",
              },
              {
                label: "Clientes Frecuentes (5 - 9 visitas)",
                count: cohorts.frequentCount,
                color: "bg-emerald-500",
                textColor: "text-emerald-600 dark:text-emerald-400",
                badge: "Habituales",
              },
              {
                label: "Clientes Ocasionales (2 - 4 visitas)",
                count: cohorts.occasionalCount,
                color: "bg-sky-500",
                textColor: "text-sky-600 dark:text-sky-400",
                badge: "En fidelización",
              },
              {
                label: "Nuevos Comensales (1 visita)",
                count: cohorts.newCount,
                color: "bg-slate-400 dark:bg-gray-500",
                textColor: "text-slate-600 dark:text-gray-300",
                badge: "Primera vez",
              },
            ].map((c) => {
              const pct = cohorts.totalCustomers > 0 ? Math.round((c.count / cohorts.totalCustomers) * 100) : 0;
              return (
                <div key={c.label} className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950/60 border border-slate-200 dark:border-dark-800 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{c.label}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${c.textColor} bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800`}>
                        {c.badge}
                      </span>
                    </div>
                    <span className="font-mono text-slate-600 dark:text-gray-300">
                      {c.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-dark-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${c.color}`}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Churn Risk Alerts (Day 75) & Actionable WhatsApp Reactivation */}
      <div className="bg-white dark:bg-dark-900 border border-amber-300 dark:border-amber-500/20 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-dark-800 gap-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Alertas de Reactivación & Prevención de Churn (Alerta Día 75)
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Comensales con puntos activos a expirar en los próximos 15 a 30 días
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-500/20">
              {churnRisk.expiring15DaysCount} clientes a vencer en 15d ({churnRisk.expiring15DaysPoints} pts)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-gray-300 font-medium">
              {churnRisk.expiring30DaysCount} en 30d ({churnRisk.expiring30DaysPoints} pts)
            </span>
          </div>
        </div>

        {churnRisk.atRiskCustomers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-gray-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
            No hay comensales en riesgo crítico de inactividad inmediata en este momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-800 text-slate-500 dark:text-gray-400 font-medium">
                  <th className="pb-2">Comensal</th>
                  <th className="pb-2">DNI / Fiscal</th>
                  <th className="pb-2">Puntos en Riesgo</th>
                  <th className="pb-2">Fecha Caducidad</th>
                  <th className="pb-2 text-right">Acción de Reactivación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60">
                {churnRisk.atRiskCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-dark-950/40">
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                    <td className="py-3 font-mono text-slate-600 dark:text-gray-300">{c.document_number}</td>
                    <td className="py-3 text-amber-600 dark:text-amber-400 font-bold">{c.points_balance} pts</td>
                    <td className="py-3 text-slate-500 dark:text-gray-400">
                      {c.points_expire_at ? new Date(c.points_expire_at).toLocaleDateString("es-AR") : "N/D"}
                    </td>
                    <td className="py-3 text-right">
                      {c.phone ? (
                        <a
                          href={generateWhatsAppUrl(c.phone, c.name, c.points_balance)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Fidelización</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 italic">Sin teléfono</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 4: Top 10 Customers & Reward Popularity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 10 Customers (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-dark-800">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top 10 Comensales Más Valiosos</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-gray-400">Por volumen de gasto</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-800 text-slate-500 dark:text-gray-400 font-medium">
                  <th className="pb-2 w-8">#</th>
                  <th className="pb-2">Comensal</th>
                  <th className="pb-2">Visitas</th>
                  <th className="pb-2">Saldo Puntos</th>
                  <th className="pb-2 text-right">Gasto Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60">
                {topCustomers.map((cust, idx) => (
                  <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-dark-950/40">
                    <td className="py-2.5">
                      {idx === 0 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-gray-400/20 text-slate-700 dark:text-gray-300 flex items-center justify-center font-bold text-[10px]">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-700/20 text-amber-800 dark:text-amber-600 flex items-center justify-center font-bold text-[10px]">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 font-mono pl-1">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{cust.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">{cust.document_number}</div>
                    </td>
                    <td className="py-2.5 text-slate-700 dark:text-gray-300 font-semibold">{cust.visit_count}</td>
                    <td className="py-2.5 text-bumeran-600 dark:text-bumeran-400 font-bold">{cust.points_balance} pts</td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ${cust.total_spent.toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Rewards Popularity (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-dark-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-bumeran-500 dark:text-bumeran-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recompensas Más Populares</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-gray-400">Canjes realizados</span>
          </div>

          <div className="space-y-3">
            {topRewards.map((reward) => (
              <div
                key={reward.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950/60 border border-slate-200 dark:border-dark-800 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{reward.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-gray-400">
                    {reward.reward_type === "BIRTHDAY_GIFT"
                      ? "Cortesía Natalicia"
                      : reward.reward_type === "VISIT_MILESTONE"
                      ? "Hito por Visitas"
                      : "Puntos por Consumo"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {reward.redemptionCount} canjes
                  </div>
                  {reward.totalPointsSpent > 0 && (
                    <div className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">
                      -{reward.totalPointsSpent} pts
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Cron Execution Logs */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-dark-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bitácora de Tareas Programadas (Crons)</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-gray-400">Últimas ejecuciones automáticas</span>
        </div>

        {recentCrons.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-gray-500">
            Aún no hay registros de tareas programadas en la bitácora.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-800 text-slate-500 dark:text-gray-400 font-medium">
                  <th className="pb-2">Tarea / Cron</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">Fecha y Hora</th>
                  <th className="pb-2">Duración</th>
                  <th className="pb-2">Detalle de Ejecución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 font-mono text-[11px]">
                {recentCrons.map((cron) => (
                  <tr key={cron.id} className="hover:bg-slate-50 dark:hover:bg-dark-950/40">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white">{cron.job_name}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cron.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : cron.status === "WARNING"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        }`}
                      >
                        {cron.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-gray-400">
                      {new Date(cron.executed_at).toLocaleString("es-AR")}
                    </td>
                    <td className="py-2.5 text-slate-700 dark:text-gray-300">{cron.duration_ms}ms</td>
                    <td className="py-2.5 text-slate-700 dark:text-gray-300 font-sans text-xs">{cron.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
