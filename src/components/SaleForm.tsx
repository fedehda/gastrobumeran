"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Award, CheckCircle2, AlertCircle, Flame } from "lucide-react";
import { Customer, LoyaltySettings, LoyaltyCampaign } from "@/types/loyalty";

interface SaleFormProps {
  customer: Customer;
  settings: LoyaltySettings;
  onSaleSuccess: (updatedCustomer: Customer, pointsEarned: number, visitAdded: boolean, message: string) => void;
}

const PRESET_AMOUNTS = [1500, 3000, 5000, 10000, 20000, 35000];

function evaluateMatchingCampaign(
  campaigns: LoyaltyCampaign[],
  amount: number,
  basePoints: number,
  sector: "TABLE" | "COUNTER" | "DELIVERY"
): { campaign: LoyaltyCampaign; extraPoints: number; totalPoints: number } | null {
  if (!campaigns.length || basePoints <= 0) return null;
  const now = new Date();
  const day = now.getDay();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  let best: { campaign: LoyaltyCampaign; extraPoints: number; totalPoints: number } | null = null;
  let maxExtra = 0;

  for (const camp of campaigns) {
    if (!camp.is_active) continue;
    if (camp.min_spend > 0 && amount < camp.min_spend) continue;
    if (camp.applicable_sectors !== "ALL" && camp.applicable_sectors !== sector) continue;
    if (camp.start_date && dateStr < camp.start_date) continue;
    if (camp.end_date && dateStr > camp.end_date) continue;
    if (camp.days_of_week.length > 0 && !camp.days_of_week.includes(day)) continue;

    if (camp.start_time && camp.end_time) {
      if (camp.start_time <= camp.end_time) {
        if (timeStr < camp.start_time || timeStr > camp.end_time) continue;
      } else {
        if (timeStr < camp.start_time && timeStr > camp.end_time) continue;
      }
    } else if (camp.start_time && timeStr < camp.start_time) continue;
    else if (camp.end_time && timeStr > camp.end_time) continue;

    const multiplierExtra = camp.multiplier > 1.0 ? Math.floor(basePoints * (camp.multiplier - 1)) : 0;
    const extra = multiplierExtra + (camp.bonus_points > 0 ? camp.bonus_points : 0);
    if (extra <= 0 && camp.multiplier <= 1.0 && camp.bonus_points <= 0) continue;

    if (!best || extra > maxExtra || (extra === maxExtra && camp.priority > best.campaign.priority)) {
      maxExtra = extra;
      best = { campaign: camp, extraPoints: extra, totalPoints: basePoints + extra };
    }
  }

  return best;
}

export function SaleForm({ customer, settings, onSaleSuccess }: SaleFormProps) {
  const [amountStr, setAmountStr] = useState("");
  const [concept, setConcept] = useState("Consumo Salón");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<LoyaltyCampaign[]>([]);

  useEffect(() => {
    fetch("/api/campaigns/active")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.campaigns)) {
          setActiveCampaigns(data.campaigns);
        }
      })
      .catch((err) => console.error("Error loading active campaigns:", err));
  }, []);

  const amount = parseFloat(amountStr) || 0;

  // Real-time calculated points
  const isEnrolled = customer.loyalty_enrolled !== 0 && customer.loyalty_enrolled !== false;
  const pointsRate = Math.max(1, settings.points_earning_rate);
  const basePoints = isEnrolled ? Math.floor(amount / pointsRate) : 0;

  // Concept & Sale type resolution
  const isCounter = concept.includes("Mostrador") || concept.includes("Take Away");
  const isDelivery = concept.includes("Delivery");
  const currentSaleType = isCounter ? "COUNTER" : isDelivery ? "DELIVERY" : "TABLE";

  // Dynamic Campaigns matching
  const matchingCampaign = evaluateMatchingCampaign(activeCampaigns, amount, basePoints, currentSaleType);
  const totalProjectedPoints = matchingCampaign ? matchingCampaign.totalPoints : basePoints;

  // Check if sector is configured to add visits
  const sectorAllowsVisit = isCounter
    ? (settings.allow_visit_counter ?? false)
    : isDelivery
    ? (settings.allow_visit_delivery ?? false)
    : (settings.allow_visit_table ?? true);

  // Projected visit addition
  const isVisitSpendEligible = amount >= settings.min_spend_for_visit;
  let isCooldownActive = false;
  if (customer.last_visit_at && isVisitSpendEligible) {
    const lastVisit = new Date(customer.last_visit_at).getTime();
    const now = new Date().getTime();
    const diffHours = (now - lastVisit) / (1000 * 60 * 60);
    isCooldownActive = diffHours < settings.visit_cooldown_hours && diffHours >= 0;
  }
  const willAddVisit = sectorAllowsVisit && isVisitSpendEligible && !isCooldownActive;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg("Ingresa un monto válido mayor a cero.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/sales/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          totalAmount: amount,
          concept,
          saleType: currentSaleType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar la venta");
      }

      onSaleSuccess(
        data.data.customer,
        data.data.points_earned,
        data.data.visit_added,
        data.data.message
      );
      setAmountStr("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido al procesar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-dark-900/90 border border-dark-750 p-5 backdrop-blur-xl shadow-card">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-dark-800">
        <div className="flex items-center space-x-2">
          <PlusCircle className="w-5 h-5 text-bumeran-500" />
          <h3 className="font-bold text-white text-base">Carga Rápida de Venta / Consumo en Caja</h3>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          Tasa: 1 pt cada ${settings.points_earning_rate.toLocaleString("es-AR")}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Amount Preset Chips */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2">
            Montos Frecuentes de Ticket
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmountStr(val.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  amount === val
                    ? "bg-bumeran-500 text-white border-bumeran-400 shadow-glow"
                    : "bg-dark-950 hover:bg-dark-800 text-gray-300 border-dark-750"
                }`}
              >
                ${val.toLocaleString("es-AR")}
              </button>
            ))}
          </div>
        </div>

        {/* Input Row: Amount & Concept */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">
              Importe Total de la Venta ($) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                $
              </div>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-8 pr-4 py-2.5 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white font-bold text-lg placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bumeran-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">
              Concepto / Punto de Despacho
            </label>
            <select
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-bumeran-500/20 transition-all"
            >
              <option value="Consumo Salón">Mesa / Salón Principal</option>
              <option value="Consumo Barra">Barra / Cocktails</option>
              <option value="Take Away / Mostrador">Take Away / Mostrador</option>
              <option value="Consumo Delivery">Pedido Delivery</option>
              <option value="Evento / Cumpleaños">Evento Especial / Cumpleaños</option>
            </select>
          </div>
        </div>

        {/* Live Calculation Box */}
        {amount > 0 && (
          isEnrolled ? (
            <div className={`p-3.5 rounded-xl border flex flex-col space-y-2 text-xs ${
              matchingCampaign
                ? "bg-gradient-to-r from-amber-950/60 via-dark-950 to-dark-950 border-amber-500/40 shadow-sm"
                : "bg-gradient-to-r from-bumeran-950/40 via-dark-950 to-dark-950 border-bumeran-500/30"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {matchingCampaign ? (
                    <div className="flex items-center text-amber-300 font-bold text-sm">
                      <Flame className="w-4 h-4 mr-1 text-amber-400 animate-pulse" />
                      +{totalProjectedPoints} Puntos a acreditar
                    </div>
                  ) : (
                    <div className="flex items-center text-bumeran-400 font-bold text-sm">
                      <Award className="w-4 h-4 mr-1 text-bumeran-500" />
                      +{basePoints} Puntos a acreditar
                    </div>
                  )}

                  {matchingCampaign && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🔥 {matchingCampaign.campaign.name}
                    </span>
                  )}
                </div>

                <span className="text-emerald-400 font-medium">
                  Vencimiento +90 días
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-gray-300 pt-1 border-t border-dark-800">
                {matchingCampaign ? (
                  <span className="text-amber-200/90 font-medium">
                    Desglose: <strong>+{basePoints}</strong> base + <strong>+{matchingCampaign.extraPoints}</strong> promo
                  </span>
                ) : null}

                {matchingCampaign && <div className="h-3 w-px bg-dark-750" />}

                <div className="flex items-center text-gray-300">
                  {!sectorAllowsVisit ? (
                    <span className="text-amber-400/90 font-medium">
                      {isCounter ? "Mostrador" : isDelivery ? "Delivery" : "Salón"} no suma visita (según reglas)
                    </span>
                  ) : willAddVisit ? (
                    <span className="text-emerald-400 font-semibold">✓ Sumará +1 Visita</span>
                  ) : isCooldownActive ? (
                    <span className="text-gray-400 italic">Cooldown 18hs activo (no suma visita repetida)</span>
                  ) : (
                    <span className="text-gray-500">Mínimo para visita: ${settings.min_spend_for_visit.toLocaleString("es-AR")}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Comensal no adherido:</strong> Esta venta se registrará contablemente pero <strong>no sumará puntos ni visitas</strong>.
                </span>
              </div>
              <span className="text-amber-400 font-bold shrink-0 ml-2">
                +0 pts
              </span>
            </div>
          )
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || amount <= 0}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-glow hover:shadow-glow-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Acreditando puntos en caja...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Confirmar Venta y Sumar {totalProjectedPoints > 0 ? `+${totalProjectedPoints} Pts` : "Puntos"}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
