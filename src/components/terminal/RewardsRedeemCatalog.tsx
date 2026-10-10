"use client";

import React, { useState } from "react";
import {
  Gift,
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Cake,
  Check,
  X,
} from "lucide-react";
import { Customer, PortalRewardProgress } from "@/types/loyalty";

interface RewardsRedeemCatalogProps {
  customer: Customer;
  rewardsProgress: PortalRewardProgress[];
  onRedeemSuccess: (
    updatedCustomer: Customer,
    rewardName: string,
    pointsDeducted: number,
    transactionMessage: string
  ) => void;
}

export function RewardsRedeemCatalog({
  customer,
  rewardsProgress,
  onRedeemSuccess,
}: RewardsRedeemCatalogProps) {
  const [filter, setFilter] = useState<"ALL" | "AVAILABLE" | "POINTS" | "VISITS">("AVAILABLE");
  const [selectedReward, setSelectedReward] = useState<PortalRewardProgress | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Filter rewards list
  const filteredRewards = rewardsProgress.filter((item) => {
    if (filter === "AVAILABLE") return item.is_redeemable;
    if (filter === "POINTS") return item.reward.reward_type === "POINTS";
    if (filter === "VISITS") return item.reward.reward_type === "VISIT_MILESTONE";
    return true;
  });

  const availableCount = rewardsProgress.filter((r) => r.is_redeemable).length;

  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;

    setIsRedeeming(true);
    setRedeemError(null);

    try {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          rewardId: selectedReward.reward.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo procesar el canje.");
      }

      const updatedCustomer: Customer = data.data.customer;
      const pointsDeducted: number = data.data.points_deducted || 0;
      const message: string = data.data.message || `Canje realizado con éxito: ${selectedReward.reward.name}`;

      onRedeemSuccess(updatedCustomer, selectedReward.reward.name, pointsDeducted, message);
      setSelectedReward(null);
    } catch (err: unknown) {
      setRedeemError(err instanceof Error ? err.message : "Error al procesar el canje.");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Title & Filter Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Catálogo de Canje</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {availableCount} disponible{availableCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter("AVAILABLE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              filter === "AVAILABLE"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Canjeables Ahora ({availableCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              filter === "ALL"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Todos ({rewardsProgress.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("POINTS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              filter === "POINTS"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Por Puntos
          </button>
          <button
            type="button"
            onClick={() => setFilter("VISITS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              filter === "VISITS"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Por Visitas
          </button>
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-2.5">
        {filteredRewards.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <Gift className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">
              {filter === "AVAILABLE"
                ? "El cliente aún no tiene saldo suficiente para canjes en esta categoría."
                : "No se encontraron productos en este filtro."}
            </p>
            {filter === "AVAILABLE" && (
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className="text-xs font-bold text-amber-400 hover:underline pt-1"
              >
                Ver todos los premios del catálogo
              </button>
            )}
          </div>
        ) : (
          filteredRewards.map((item) => {
            const { reward, is_redeemable, progress_percent, points_needed, visits_needed } = item;
            const isPointsType = reward.reward_type === "POINTS";
            const isVisitType = reward.reward_type === "VISIT_MILESTONE";
            const isBirthday = reward.reward_type === "BIRTHDAY_GIFT";

            return (
              <div
                key={reward.id}
                className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${
                  is_redeemable
                    ? "bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/5 hover:border-amber-400"
                    : "bg-slate-900/50 border-slate-800/80 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    {/* Badge */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          is_redeemable
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {isPointsType && (
                          <>
                            <Award className="w-2.5 h-2.5 mr-1" />
                            {reward.requirement_value} Pts
                          </>
                        )}
                        {isVisitType && (
                          <>
                            <Calendar className="w-2.5 h-2.5 mr-1" />
                            {reward.requirement_value} Visitas
                          </>
                        )}
                        {isBirthday && (
                          <>
                            <Cake className="w-2.5 h-2.5 mr-1" />
                            Cumpleaños
                          </>
                        )}
                      </span>

                      {is_redeemable && (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>¡Listo para canjear!</span>
                        </span>
                      )}
                    </div>

                    {/* Reward Name */}
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {reward.name}
                    </h4>

                    {/* Description */}
                    {reward.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {reward.description}
                      </p>
                    )}
                  </div>

                  {/* Redeem Button / Action */}
                  <div className="shrink-0 flex flex-col items-end justify-center pt-1">
                    {is_redeemable ? (
                      <button
                        type="button"
                        onClick={() => setSelectedReward(item)}
                        className="py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition flex items-center gap-1.5"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>Aceptar Canje</span>
                      </button>
                    ) : (
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {isPointsType && `Faltan ${points_needed} pts`}
                          {isVisitType && `Faltan ${visits_needed} visitas`}
                          {isBirthday && "No disponible"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar if not eligible */}
                {!is_redeemable && (
                  <div className="mt-3 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>Progreso hacia el premio</span>
                      <span>{progress_percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full transition-all duration-300"
                        style={{ width: `${progress_percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Tactile Redemption Confirmation Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Confirmar Entrega de Canje</h4>
                  <p className="text-[10px] text-slate-400">Operación de Caja y Mozo</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isRedeeming}
                onClick={() => setSelectedReward(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product & Customer Details */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Producto a entregar
                </span>
                <p className="text-base font-black text-amber-400 leading-snug">
                  {selectedReward.reward.name}
                </p>
                {selectedReward.reward.description && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedReward.reward.description}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Comensal</span>
                  <span className="font-bold text-white line-clamp-1">{customer.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">DNI: {customer.document_number}</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Débito FIFO</span>
                  {selectedReward.reward.reward_type === "POINTS" ? (
                    <div>
                      <span className="font-bold text-rose-400">
                        -{selectedReward.reward.requirement_value} pts
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Quedan: {customer.points_balance - selectedReward.reward.requirement_value} pts
                      </span>
                    </div>
                  ) : (
                    <span className="font-bold text-blue-400">Sin costo de pts</span>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {redeemError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{redeemError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isRedeeming}
                onClick={() => setSelectedReward(null)}
                className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRedeeming}
                onClick={handleConfirmRedeem}
                className="w-2/3 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 active:scale-95"
              >
                {isRedeeming ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Aceptar y Entregar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
