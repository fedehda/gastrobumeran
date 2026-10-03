"use client";

import React, { useState } from "react";
import {
  Award,
  Calendar,
  Clock,
  DollarSign,
  Phone,
  Mail,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  UserX,
  Sparkles,
  X,
  Cake,
  Gift,
  CheckCircle,
} from "lucide-react";
import { Customer, BirthdayStatus } from "@/types/loyalty";
import { formatBirthdayDisplay } from "@/lib/loyalty/date-utils";

interface CustomerCardProps {
  customer: Customer;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
  oldestBatchDaysLeft?: number | null;
  birthdayStatus?: BirthdayStatus;
  onClearCustomer: () => void;
  onRedeemBirthday?: () => Promise<void>;
  onCustomerUpdated?: (customer: Customer, message: string) => void;
}

export function CustomerCard({
  customer,
  daysUntilExpiration,
  isExpiringSoon,
  oldestBatchDaysLeft,
  birthdayStatus,
  onClearCustomer,
  onRedeemBirthday,
  onCustomerUpdated,
}: CustomerCardProps) {
  const [isClaimingBirthday, setIsClaimingBirthday] = useState(false);
  const [isUpdatingEnrollment, setIsUpdatingEnrollment] = useState(false);

  const isEnrolled = customer.loyalty_enrolled !== 0 && customer.loyalty_enrolled !== false;

  const handleToggleEnrollment = async (enrolled: boolean) => {
    setIsUpdatingEnrollment(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loyalty_enrolled: enrolled,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al actualizar estado");
      }
      if (onCustomerUpdated) {
        onCustomerUpdated(data.customer, data.message);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al actualizar estado");
    } finally {
      setIsUpdatingEnrollment(false);
    }
  };

  const formatExpiration = (dateStr?: string | null) => {
    if (!dateStr) return "Sin consumos aún";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleClaimBirthday = async () => {
    if (!onRedeemBirthday) return;
    setIsClaimingBirthday(true);
    try {
      await onRedeemBirthday();
    } finally {
      setIsClaimingBirthday(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-dark-900/90 border border-dark-750 p-5 backdrop-blur-xl shadow-card transition-all space-y-4">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-bumeran-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Birthday Courtesy Banner (si está en la ventana de agasajo) */}
      {birthdayStatus?.isEligible && (
        <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-bumeran-500/15 to-purple-500/20 border border-amber-500/50 shadow-glow-gold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 text-xl shadow-inner">
              🎂
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-white">
                  ¡Semana de Cumpleaños de {customer.name}!
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-400/30">
                  Cortesía Anual
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Habilitado: <strong>Postre de la Casa de Cortesía (Invitación especial)</strong>. Costo: 0 puntos.
              </p>
            </div>
          </div>

          <button
            onClick={handleClaimBirthday}
            disabled={isClaimingBirthday}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-bumeran-500 hover:from-amber-400 hover:to-bumeran-400 text-white font-extrabold text-xs shadow-glow-gold transition-all flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50"
          >
            {isClaimingBirthday ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                <span>Canjear Cortesía Ahora</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Non-enrolled notice banner */}
      {!isEnrolled && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 text-lg">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white">Comensal No Adherido al Programa</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                  Sin Acumulación
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Sus consumos se registran para estadísticas, pero no acumula puntos ni sella visitas.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleEnrollment(true)}
            disabled={isUpdatingEnrollment}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 text-white font-bold text-xs shadow-glow transition-all flex items-center justify-center space-x-1.5 shrink-0"
          >
            {isUpdatingEnrollment ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Adherir a Fidelidad</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Top row: Customer identity & actions */}
      <div className="flex items-start justify-between pb-3 border-b border-dark-800">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-bumeran-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-xl shadow-glow">
            {customer.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">{customer.name}</h2>
              {isEnrolled ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center">
                  <UserCheck className="w-3 h-3 mr-1" /> Fidelizado
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center">
                  <UserX className="w-3 h-3 mr-1" /> No Adherido
                </span>
              )}
              {customer.birth_date && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-medium flex items-center">
                  <Cake className="w-3 h-3 mr-1" />
                  {formatBirthdayDisplay(customer.birth_date)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
              <span>DNI / CUIT: <strong className="text-gray-200">{customer.document_number}</strong></span>
              {customer.phone && (
                <span className="flex items-center text-gray-300">
                  <Phone className="w-3 h-3 mr-1 text-gray-500" /> {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center text-gray-300">
                  <Mail className="w-3 h-3 mr-1 text-gray-500" /> {customer.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isEnrolled ? (
            <button
              onClick={() => {
                if (window.confirm(`¿Deseas pausar/desactivar la participación de ${customer.name} en el programa de fidelidad? (Dejará de sumar puntos).`)) {
                  handleToggleEnrollment(false);
                }
              }}
              disabled={isUpdatingEnrollment}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-amber-300 hover:bg-dark-800 border border-dark-750 transition-colors"
              title="Pausar fidelidad"
            >
              Pausar Fidelidad
            </button>
          ) : (
            <button
              onClick={() => handleToggleEnrollment(true)}
              disabled={isUpdatingEnrollment}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 shadow-glow transition-all flex items-center space-x-1"
            >
              {isUpdatingEnrollment ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Adherir</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClearCustomer}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 border border-dark-750 transition-colors"
            title="Cambiar cliente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loyalty Metrics Scorecards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Puntos Disponibles */}
        <div className="p-3.5 rounded-xl bg-dark-950/70 border border-bumeran-500/30 shadow-inner">
          <div className="flex items-center justify-between text-xs text-bumeran-400 font-semibold mb-1">
            <span className="flex items-center">
              <Award className="w-3.5 h-3.5 mr-1" /> Puntos Activos
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {customer.points_balance.toLocaleString("es-AR")}
            <span className="text-xs text-bumeran-400 font-normal ml-1">pts</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Equiv. a ${(customer.points_balance * 10).toLocaleString("es-AR")} en catálogo
          </div>
        </div>

        {/* Visitas Computadas */}
        <div className="p-3.5 rounded-xl bg-dark-950/70 border border-dark-750">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span className="flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-amber-400" /> Frecuencia Visitas
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {customer.visit_count}
            <span className="text-xs text-gray-400 font-normal ml-1">visitas</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {customer.visit_count >= 5 ? "Comensal Frecuente ⭐" : `${5 - customer.visit_count} para hito #5`}
          </div>
        </div>

        {/* Sistema Dual de Caducidad (Timer 1 + Timer 2) */}
        <div
          className={`p-3.5 rounded-xl bg-dark-950/70 border transition-all ${
            isExpiringSoon
              ? "border-amber-500/60 bg-amber-500/5 animate-pulse"
              : "border-dark-750"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="flex items-center text-gray-400">
              <Clock className="w-3.5 h-3.5 mr-1 text-blue-400" /> Doble Caducidad
            </span>
            {isExpiringSoon && (
              <span className="flex items-center text-[10px] text-amber-400 font-bold">
                <AlertTriangle className="w-3 h-3 mr-0.5" /> Día 75+
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-white tracking-tight">
            T1: {daysUntilExpiration !== null ? `${daysUntilExpiration}d inactividad` : "Sin activar"}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {oldestBatchDaysLeft !== null ? (
              <span className="text-blue-400 font-medium">T2 (FIFO): {oldestBatchDaysLeft}d lote máx</span>
            ) : (
              <span>Vence {formatExpiration(customer.points_expire_at)}</span>
            )}
          </div>
        </div>

        {/* Total Consumido */}
        <div className="p-3.5 rounded-xl bg-dark-950/70 border border-dark-750">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span className="flex items-center">
              <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Consumo Total
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            ${customer.total_spent.toLocaleString("es-AR")}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Gasto histórico acumulado</div>
        </div>
      </div>

      {/* Explanatory banner for Dual Timer & FIFO */}
      <div className="px-3 py-2 rounded-lg bg-dark-950/50 border border-dark-800 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Modelo Dual Anti-Inflacionario:</strong> Timer 1 resetea 90d por cada compra • Timer 2 limita la vida del lote a 365d • Los canjes consumen lotes por <strong>FIFO</strong>.
          </span>
        </div>
      </div>

      {/* Customer Portal & QR Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dark-800/80">
        <div className="flex items-center gap-2">
          <a
            href={`/portal?dni=${customer.document_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition flex items-center gap-1.5"
            title="Abrir la tarjeta digital interactiva que ve el comensal"
          >
            <span>📱</span>
            <span>Ver Tarjeta Digital & QR</span>
          </a>

          {customer.phone && (
            <a
              href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                `¡Hola ${customer.name}! Acá tenés el acceso a tu Tarjeta Digital de Fidelización en GastroBumeran con tus ${customer.points_balance} puntos acumulados: ${
                  typeof window !== "undefined" ? window.location.origin : ""
                }/portal?dni=${customer.document_number}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition flex items-center gap-1.5"
              title="Enviar tarjeta al cliente por WhatsApp"
            >
              <span>💬</span>
              <span>Enviar por WhatsApp</span>
            </a>
          )}
        </div>

        <span className="text-[11px] text-gray-400">
          El cliente puede escanear su QR desde su teléfono en este punto de cobro
        </span>
      </div>
    </div>
  );
}
