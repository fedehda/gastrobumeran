"use client";

import React from "react";
import {
  Sparkles,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wifi,
} from "lucide-react";
import { CustomerPortalCard } from "@/types/loyalty";

interface LoyaltyCardVisualProps {
  cardData: CustomerPortalCard;
  onOpenQr: () => void;
}

export function LoyaltyCardVisual({ cardData, onOpenQr }: LoyaltyCardVisualProps) {
  const {
    customer,
    tier,
    birthday_status,
    days_until_inactivity_expiry,
    is_expiring_soon,
    next_expiring_batch,
  } = cardData;

  // Mask DNI for aesthetic display e.g. 30.***.456
  const formatMaskedDoc = (doc: string) => {
    if (!doc) return "---";
    if (doc.length > 5) {
      return `${doc.slice(0, 2)} ••• ${doc.slice(-3)}`;
    }
    return doc;
  };

  // Stamp card for frequency (up to 5 or 10 stamps)
  const maxStamps = tier.level >= 3 ? 10 : 5;
  const currentStamps = Math.min(maxStamps, customer.visit_count % maxStamps || (customer.visit_count > 0 ? maxStamps : 0));

  return (
    <div className="w-full space-y-4">
      {/* Birthday Banner if in window */}
      {birthday_status.isEligible && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-900/40 via-purple-900/30 to-amber-900/40 border border-pink-500/40 p-4 shadow-lg shadow-pink-500/10 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 text-xl">
              🎂
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-pink-200">
                ¡Semana de tu Cumpleaños!
              </h4>
              <p className="text-xs text-pink-300/80">
                Tenés habilitado un <strong>Postre de la Casa de cortesía</strong>. Mostrá tu tarjeta al mozo o en caja para disfrutarlo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expiration Warning Banner if <= 15 days */}
      {is_expiring_soon && (
        <div className="rounded-2xl bg-amber-950/40 border border-amber-500/40 p-3.5 flex items-center gap-3 text-amber-200 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-amber-300">¡Alerta Anti-Inflación!</span>{" "}
            Tus {customer.points_balance} puntos vencerán en <strong>{days_until_inactivity_expiry} día(s)</strong> por inactividad. Cualquier consumo nuevo resetea el reloj a 90 días.
          </div>
        </div>
      )}

      {/* VIP Digital Membership Card (Credit Card Shape) */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tier.gradient_class} border p-6 text-white shadow-2xl transition-all duration-300 hover:scale-[1.01]`}
      >
        {/* Subtle Background Pattern & Glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-start justify-between relative z-10 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-dark-950 font-black shadow-md shadow-amber-500/30">
              <span className="text-lg">🔁</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-white">
                  GastroBumeran
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  Club
                </span>
              </div>
              <span className="text-[10px] text-gray-400 tracking-wider uppercase block">
                Fidelización Gastronómica
              </span>
            </div>
          </div>

          {/* Tier Badge & NFC */}
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md uppercase tracking-wider ${tier.badge_color}`}
            >
              {tier.name}
            </div>
            <Wifi className="w-4 h-4 text-gray-400 rotate-90 opacity-70" />
          </div>
        </div>

        {/* Chip & Masked ID Row */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          {/* Gold Chip Graphic */}
          <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 border border-amber-300/60 shadow-sm relative overflow-hidden flex items-center justify-center">
            <div className="w-full h-px bg-amber-700/40 absolute top-2.5" />
            <div className="w-full h-px bg-amber-700/40 absolute bottom-2.5" />
            <div className="h-full w-px bg-amber-700/40 absolute left-3.5" />
            <div className="h-full w-px bg-amber-700/40 absolute right-3.5" />
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest block">
              DNI Miembro
            </span>
            <span className="text-xs font-mono font-medium text-gray-200 tracking-wider">
              {formatMaskedDoc(customer.document_number)}
            </span>
          </div>
        </div>

        {/* Central Balance & QR Trigger */}
        <div className="grid grid-cols-12 gap-4 items-center relative z-10 py-2">
          {/* Left: Points & Visits */}
          <div className="col-span-8 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300/90 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Puntos Disponibles
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
              {customer.points_balance.toLocaleString("es-AR")}
            </div>
            <p className="text-xs text-gray-300 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                <strong>{customer.visit_count}</strong> {customer.visit_count === 1 ? "visita acumulada" : "visitas acumuladas"}
              </span>
            </p>
          </div>

          {/* Right: Interactive QR Code Button */}
          <div className="col-span-4 flex flex-col items-center justify-center">
            <button
              onClick={onOpenQr}
              className="group relative p-2.5 rounded-2xl bg-white/95 text-dark-950 hover:bg-white shadow-xl hover:shadow-amber-500/20 hover:scale-105 transition active:scale-95 border-2 border-amber-400 flex flex-col items-center gap-1 cursor-pointer"
              title="Agrandar código QR para escanear"
            >
              <QrCode className="w-10 h-10 text-dark-950 group-hover:scale-110 transition" />
              <span className="text-[9px] font-bold text-dark-950 uppercase tracking-tight">
                Ver QR
              </span>
            </button>
          </div>
        </div>

        {/* Stamp Cards Visualization */}
        <div className="mt-5 pt-4 border-t border-white/10 relative z-10">
          <div className="flex items-center justify-between text-[11px] text-gray-300 mb-2">
            <span className="font-semibold flex items-center gap-1">
              <span>🎯 Sellos por Visitas</span>
              <span className="text-gray-400">({currentStamps}/{maxStamps})</span>
            </span>
            {tier.next_tier_name && (
              <span className="text-amber-300 font-medium text-[10px]">
                {tier.visits_needed_for_next} para {tier.next_tier_name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
            {Array.from({ length: maxStamps }).map((_, idx) => {
              const isStamped = idx < currentStamps;
              return (
                <div
                  key={idx}
                  className={`h-9 rounded-xl flex items-center justify-center border text-xs font-bold transition-all ${
                    isStamped
                      ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm shadow-amber-500/20"
                      : "bg-black/30 border-white/10 text-gray-500"
                  }`}
                >
                  {isStamped ? "🍔" : idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Footer: Timers and Holder Name */}
        <div className="mt-5 pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 relative z-10 text-[11px]">
          <div>
            <span className="text-[10px] text-gray-400 block uppercase tracking-wider">
              Titular
            </span>
            <span className="font-bold text-gray-100 text-sm tracking-wide">
              {customer.name}
            </span>
          </div>

          {/* Timers info */}
          <div className="text-right space-y-0.5">
            {days_until_inactivity_expiry !== null && (
              <div className="flex items-center justify-end gap-1 text-gray-300">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>
                  Vigencia: <strong>{days_until_inactivity_expiry}d</strong>
                </span>
              </div>
            )}
            {next_expiring_batch && (
              <div className="text-[10px] text-gray-400">
                Lote {next_expiring_batch.points} pts vence en {next_expiring_batch.days_left}d
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
