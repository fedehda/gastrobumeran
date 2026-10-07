"use client";

import React, { useState } from "react";
import { Gift, CheckCircle, Lock, Sparkles, ChevronRight } from "lucide-react";
import { PortalRewardProgress } from "@/types/loyalty";

interface CustomerRewardsCatalogProps {
  rewardsProgress: PortalRewardProgress[];
  onOpenQr: () => void;
}

export function CustomerRewardsCatalog({
  rewardsProgress,
  onOpenQr,
}: CustomerRewardsCatalogProps) {
  const [filter, setFilter] = useState<"ALL" | "READY" | "PROGRESS">("ALL");

  const readyCount = rewardsProgress.filter((r) => r.is_redeemable).length;
  const inProgressCount = rewardsProgress.filter((r) => !r.is_redeemable).length;

  const filteredRewards = rewardsProgress.filter((item) => {
    if (filter === "READY") return item.is_redeemable;
    if (filter === "PROGRESS") return !item.is_redeemable;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            Catálogo de Recompensas
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Premios y cortesías disponibles con tus puntos y sellos de visita
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-gray-800 self-start sm:self-auto">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === "ALL"
                ? "bg-amber-500 text-slate-950 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Todos ({rewardsProgress.length})
          </button>
          <button
            onClick={() => setFilter("READY")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              filter === "READY"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <span>Desbloqueados</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filter === "READY"
                  ? "bg-emerald-700 text-white"
                  : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
              }`}
            >
              {readyCount}
            </span>
          </button>
          <button
            onClick={() => setFilter("PROGRESS")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === "PROGRESS"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-dark-800 dark:text-amber-300 dark:border-amber-500/30"
                : "text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            En Progreso ({inProgressCount})
          </button>
        </div>
      </div>

      {/* Rewards Grid */}
      {filteredRewards.length === 0 ? (
        <div className="text-center py-10 rounded-2xl bg-white dark:bg-dark-900/60 border border-slate-200 dark:border-gray-800/80 p-6 shadow-sm">
          <Gift className="w-10 h-10 text-slate-400 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-slate-700 dark:text-gray-300 font-medium">
            No hay recompensas en este filtro.
          </p>
          <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
            Probá seleccionando &quot;Todos&quot; para ver el catálogo completo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredRewards.map((item) => {
            const { reward, is_redeemable, progress_percent, points_needed, visits_needed } = item;

            return (
              <div
                key={reward.id}
                className={`relative rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between shadow-sm ${
                  is_redeemable
                    ? "bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-dark-900 dark:to-dark-900 border-emerald-300 dark:border-emerald-500/50 shadow-emerald-500/5"
                    : "bg-white dark:bg-dark-900/80 border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700"
                }`}
              >
                {/* Header: Title and Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition">
                      {reward.name}
                    </h4>
                    {is_redeemable ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 animate-pulse">
                        <CheckCircle className="w-3 h-3" />
                        ¡Desbloqueado!
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700">
                        <Lock className="w-3 h-3" />
                        {progress_percent}%
                      </span>
                    )}
                  </div>

                  {reward.description && (
                    <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {reward.description}
                    </p>
                  )}
                </div>

                {/* Progress Bar & Requirement */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 dark:text-gray-400 text-[11px]">
                      Requisito:{" "}
                      <strong className="text-amber-600 dark:text-amber-300">
                        {reward.reward_type === "POINTS" && `${reward.requirement_value} Puntos`}
                        {reward.reward_type === "VISIT_MILESTONE" && `${reward.requirement_value} Visitas`}
                        {reward.reward_type === "BIRTHDAY_GIFT" && "Semana Natalicia"}
                      </strong>
                    </span>

                    {/* Missing amount notice */}
                    {!is_redeemable && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        {points_needed > 0 && `Faltan ${points_needed} pts`}
                        {visits_needed > 0 && `Faltan ${visits_needed} visitas`}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-dark-950 border border-slate-200 dark:border-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        is_redeemable
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : "bg-gradient-to-r from-amber-500 to-amber-400"
                      }`}
                      style={{ width: `${progress_percent}%` }}
                    />
                  </div>

                  {/* Redeem Button or Action Prompt */}
                  {is_redeemable && (
                    <button
                      onClick={onOpenQr}
                      className="mt-3 w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Pedir en Caja (Mostrar QR)</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
