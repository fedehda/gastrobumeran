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
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            Catálogo de Recompensas
          </h3>
          <p className="text-xs text-gray-400">
            Premios y cortesías disponibles con tus puntos y sellos de visita
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-dark-900 border border-gray-800 self-start sm:self-auto">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === "ALL"
                ? "bg-amber-500 text-dark-950 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Todos ({rewardsProgress.length})
          </button>
          <button
            onClick={() => setFilter("READY")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              filter === "READY"
                ? "bg-emerald-500 text-dark-950 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>Desbloqueados</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/60 text-[10px]">
              {readyCount}
            </span>
          </button>
          <button
            onClick={() => setFilter("PROGRESS")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === "PROGRESS"
                ? "bg-dark-800 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            En Progreso ({inProgressCount})
          </button>
        </div>
      </div>

      {/* Rewards Grid */}
      {filteredRewards.length === 0 ? (
        <div className="text-center py-10 rounded-2xl bg-dark-900/60 border border-gray-800/80 p-6">
          <Gift className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-300 font-medium">
            No hay recompensas en este filtro.
          </p>
          <p className="text-xs text-gray-500 mt-1">
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
                className={`relative rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                  is_redeemable
                    ? "bg-gradient-to-br from-emerald-950/40 via-dark-900 to-dark-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                    : "bg-dark-900/80 border-gray-800 hover:border-gray-700"
                }`}
              >
                {/* Header: Title and Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                      {reward.name}
                    </h4>
                    {is_redeemable ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                        <CheckCircle className="w-3 h-3" />
                        ¡Desbloqueado!
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
                        <Lock className="w-3 h-3" />
                        {progress_percent}%
                      </span>
                    )}
                  </div>

                  {reward.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                      {reward.description}
                    </p>
                  )}
                </div>

                {/* Progress Bar & Requirement */}
                <div className="mt-3 pt-3 border-t border-gray-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-400 text-[11px]">
                      Requisito:{" "}
                      <strong className="text-amber-300">
                        {reward.reward_type === "POINTS" && `${reward.requirement_value} Puntos`}
                        {reward.reward_type === "VISIT_MILESTONE" && `${reward.requirement_value} Visitas`}
                        {reward.reward_type === "BIRTHDAY_GIFT" && "Semana Natalicia"}
                      </strong>
                    </span>

                    {/* Missing amount notice */}
                    {!is_redeemable && (
                      <span className="text-[11px] text-amber-400 font-medium">
                        {points_needed > 0 && `Faltan ${points_needed} pts`}
                        {visits_needed > 0 && `Faltan ${visits_needed} visitas`}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-dark-950 border border-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        is_redeemable
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : "bg-gradient-to-r from-amber-600 to-amber-400"
                      }`}
                      style={{ width: `${progress_percent}%` }}
                    />
                  </div>

                  {/* Redeem Button or Action Prompt */}
                  {is_redeemable && (
                    <button
                      onClick={onOpenQr}
                      className="mt-3 w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
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
