"use client";

import React, { useState } from "react";
import { Gift, Award, Calendar, Check, Sparkles, AlertCircle } from "lucide-react";
import { Customer, LoyaltyReward } from "@/types/loyalty";

interface EligibleReward extends LoyaltyReward {
  isEligible: boolean;
  progress: number;
}

interface RewardsListProps {
  customer: Customer;
  rewards: EligibleReward[];
  onRedeemSuccess: (updatedCustomer: Customer, reward: LoyaltyReward, message: string) => void;
}

export function RewardsList({ customer, rewards, onRedeemSuccess }: RewardsListProps) {
  const [selectedReward, setSelectedReward] = useState<EligibleReward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

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
          rewardId: selectedReward.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar el canje");
      }

      onRedeemSuccess(data.data.customer, data.data.reward, data.data.message);
      setSelectedReward(null);
    } catch (err: unknown) {
      setRedeemError(err instanceof Error ? err.message : "Error al canjear premio");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-dark-900/90 border border-slate-200 dark:border-dark-750 p-5 backdrop-blur-xl shadow-card transition-colors duration-200">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-dark-800">
        <div className="flex items-center space-x-2">
          <Gift className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Catálogo de Recompensas & Canje</h3>
        </div>
        <span className="text-xs text-bumeran-600 dark:text-bumeran-400 font-semibold">
          Saldo disponible: {customer.points_balance} pts
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rewards.map((r) => {
          const isPointsType = r.reward_type === "POINTS";
          return (
            <div
              key={r.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                r.isEligible
                  ? "bg-amber-50/70 dark:bg-dark-950/90 border-amber-500/40 shadow-sm dark:shadow-glow-gold hover:border-amber-500/70"
                  : "bg-slate-50 dark:bg-dark-950/40 border-slate-200 dark:border-dark-800 opacity-80"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                        isPointsType
                          ? "bg-bumeran-500/10 text-bumeran-600 dark:text-bumeran-400 border border-bumeran-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {isPointsType ? (
                        <>
                          <Award className="w-2.5 h-2.5 mr-1" />
                          {r.requirement_value} Puntos
                        </>
                      ) : (
                        <>
                          <Calendar className="w-2.5 h-2.5 mr-1" />
                          Hito: {r.requirement_value} Visitas
                        </>
                      )}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{r.name}</h4>
                  </div>
                  {r.isEligible && (
                    <span className="shrink-0 p-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" title="Disponible para canjear">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {r.description && (
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 line-clamp-2">{r.description}</p>
                )}

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-gray-400 mb-1">
                    <span>
                      {isPointsType
                        ? `${customer.points_balance} / ${r.requirement_value} pts`
                        : `${customer.visit_count} / ${r.requirement_value} visitas`}
                    </span>
                    <span className={r.isEligible ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-gray-400"}>
                      {r.progress}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        r.isEligible ? "bg-gradient-to-r from-emerald-500 to-amber-500" : "bg-bumeran-500/40"
                      }`}
                      style={{ width: `${r.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-dark-800/80">
                <button
                  type="button"
                  disabled={!r.isEligible}
                  onClick={() => {
                    setRedeemError(null);
                    setSelectedReward(r);
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    r.isEligible
                      ? "bg-gradient-to-r from-amber-600 to-bumeran-600 hover:from-amber-500 hover:to-bumeran-500 text-white shadow-sm hover:shadow-glow-gold"
                      : "bg-slate-100 text-slate-400 border border-slate-200 dark:bg-dark-900 dark:text-gray-500 dark:border-dark-800 cursor-not-allowed"
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{r.isEligible ? "Canjear en Caja" : "Puntos / Visitas Insuficientes"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmar Entrega de Recompensa</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">Punto de Cobro / Caja</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 mb-4 space-y-2">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedReward.name}</div>
              <div className="text-xs text-slate-600 dark:text-gray-400">Comensal: <strong className="text-slate-800 dark:text-gray-200">{customer.name}</strong></div>
              {selectedReward.reward_type === "POINTS" ? (
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Se debitarán <strong>{selectedReward.requirement_value} puntos</strong> del saldo actual ({customer.points_balance} pts).
                </div>
              ) : (
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Beneficio acreditado por frecuencia (Hito de {selectedReward.requirement_value} visitas alcanzadas).
                </div>
              )}
            </div>

            {redeemError && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{redeemError}</span>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={isRedeeming}
                onClick={() => setSelectedReward(null)}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:hover:bg-dark-750 dark:text-gray-300 border border-slate-200 dark:border-transparent text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRedeeming}
                onClick={handleConfirmRedeem}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-bumeran-600 hover:from-amber-500 hover:to-bumeran-500 text-white text-xs font-bold transition-all shadow-glow-gold flex items-center justify-center space-x-1.5"
              >
                {isRedeeming ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Entregar Premio</span>
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
