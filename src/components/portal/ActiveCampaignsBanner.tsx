"use client";

import React from "react";
import { Flame, Sparkles, Clock, Calendar, Zap } from "lucide-react";
import { LoyaltyCampaign } from "@/types/loyalty";

interface ActiveCampaignsBannerProps {
  campaigns?: LoyaltyCampaign[];
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function ActiveCampaignsBanner({ campaigns }: ActiveCampaignsBannerProps) {
  if (!campaigns || campaigns.length === 0) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-white to-amber-50/50 dark:from-amber-950/40 dark:via-dark-900 dark:to-dark-950 border border-amber-200 dark:border-amber-500/30 p-4 sm:p-5 space-y-3.5 shadow-sm dark:shadow-lg dark:shadow-amber-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Promociones y Días Especiales</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30">
                ¡Puntos extra!
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Aprovechá estos momentos para multiplicar tus puntos más rápido
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {campaigns.map((camp) => {
          const daysText =
            camp.days_of_week && camp.days_of_week.length > 0 && camp.days_of_week.length < 7
              ? camp.days_of_week.map((d) => DAY_NAMES[d] || "").filter(Boolean).join(", ")
              : "Todos los días";

          const sectorLabel =
            camp.applicable_sectors === "TABLE"
              ? "Salón"
              : camp.applicable_sectors === "COUNTER"
              ? "Mostrador / Take Away"
              : camp.applicable_sectors === "DELIVERY"
              ? "Delivery"
              : "Todos los canales";

          return (
            <div
              key={camp.id}
              className="p-3.5 rounded-xl bg-white dark:bg-dark-950/80 border border-slate-200 dark:border-dark-800 hover:border-amber-400/60 dark:hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-2.5 relative overflow-hidden group shadow-sm dark:shadow-none"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-200 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>{camp.name}</span>
                  </h4>
                  {camp.description && (
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {camp.description}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1">
                  {camp.multiplier > 1.0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-dark-950 font-black text-xs shadow-sm">
                      x{camp.multiplier} Puntos
                    </span>
                  )}
                  {camp.bonus_points > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 font-bold text-[10px]">
                      +{camp.bonus_points} pts
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-dark-800/80 text-[10px] text-slate-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400 dark:text-gray-500" />
                  <span>{daysText}</span>
                </div>

                {(camp.start_time || camp.end_time) && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400 dark:text-gray-500" />
                    <span>
                      {camp.start_time || "00:00"} - {camp.end_time || "23:59"} hs
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1 ml-auto text-amber-600 dark:text-amber-400/80 font-medium">
                  <Zap className="w-2.5 h-2.5" />
                  <span>{sectorLabel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
