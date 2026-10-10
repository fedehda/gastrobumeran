"use client";

import React from "react";
import {
  Award,
  Calendar,
  Cake,
  Clock,
  Sparkles,
  RefreshCw,
  Phone,
} from "lucide-react";
import { CustomerPortalCard } from "@/types/loyalty";

interface CustomerLoyaltyCardProps {
  card: CustomerPortalCard;
  restaurantName?: string;
  onClearCustomer: () => void;
}

export function CustomerLoyaltyCard({
  card,
  restaurantName,
  onClearCustomer,
}: CustomerLoyaltyCardProps) {
  const {
    customer,
    tier,
    birthday_status,
    is_expiring_soon,
    days_until_inactivity_expiry,
  } = card;

  // Determine tier gradient & styling
  const tierColor =
    tier?.name === "VIP Black"
      ? "from-slate-900 via-neutral-900 to-black border-amber-400/50 text-amber-300"
      : tier?.name === "Oro"
      ? "from-amber-950/70 via-slate-900 to-amber-900/40 border-amber-500/40 text-amber-400"
      : tier?.name === "Plata"
      ? "from-slate-900 via-zinc-900 to-slate-800 border-slate-400/40 text-slate-200"
      : "from-stone-900 via-zinc-900 to-neutral-900 border-amber-900/40 text-amber-200/90";

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {/* Visual Digital Card */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 border bg-gradient-to-br ${tierColor} shadow-2xl transition-all`}
      >
        {/* Subtle Background Pattern */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />

        {/* Top Card Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shadow-inner">
              🔁
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {restaurantName || "Club de Fidelidad"}
              </p>
              <h3 className="text-xs font-black text-white tracking-tight">Tarjeta de Cliente</h3>
            </div>
          </div>

          {/* Tier Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              {tier?.name || "Bronce"}
            </span>
          </div>
        </div>

        {/* Customer Identity */}
        <div className="mb-5">
          <h2 className="text-lg font-black text-white tracking-tight leading-snug line-clamp-1">
            {customer.name}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
            <span className="font-mono bg-black/30 px-2 py-0.5 rounded-lg border border-white/5">
              DNI: {customer.document_number}
            </span>
            {customer.phone && (
              <span className="flex items-center gap-1 text-slate-400">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{customer.phone}</span>
              </span>
            )}
          </div>
        </div>

        {/* Dual Metrics: Balance de Puntos & Visitas */}
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10">
          <div className="bg-black/35 rounded-2xl p-3 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Puntos Disponibles</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-400 tracking-tight">
                {customer.points_balance}
              </span>
              <span className="text-[11px] font-bold text-amber-400/80 uppercase">pts</span>
            </div>
          </div>

          <div className="bg-black/35 rounded-2xl p-3 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Visitas Acumuladas</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tight">
                {customer.visit_count}
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase">visitas</span>
            </div>
          </div>
        </div>

        {/* Alerts: Birthday Courtesy or Points Expiration */}
        {(birthday_status.isEligible || is_expiring_soon) && (
          <div className="mt-3 space-y-2">
            {birthday_status.isEligible && (
              <div className="px-3 py-2 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-200 text-xs font-semibold flex items-center gap-2 animate-pulse">
                <Cake className="w-4 h-4 text-pink-400 shrink-0" />
                <span>🎂 ¡Cumpleaños! Tiene cortesía anual lista para canje.</span>
              </div>
            )}

            {is_expiring_soon && days_until_inactivity_expiry !== null && (
              <div className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>⚠️ Puntos próximos a vencer en {days_until_inactivity_expiry} días.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Action: Change / Scan Another Customer */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-400">Cliente activo en caja</span>
        <button
          type="button"
          onClick={onClearCustomer}
          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Escanear Otro Cliente</span>
        </button>
      </div>
    </div>
  );
}
