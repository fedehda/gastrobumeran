"use client";

import React, { useState } from "react";
import { UserPlus, X, Check, AlertCircle, Zap, Building2 } from "lucide-react";
import { Customer } from "@/types/loyalty";
import { isLegalEntityCuit } from "@/lib/validation/cuit";

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
  initialQuery?: string;
}

interface NewCustomerFormProps {
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
  initialQuery: string;
}

function NewCustomerForm({ onClose, onCustomerCreated, initialQuery }: NewCustomerFormProps) {
  const clean = initialQuery.trim();
  const isNumeric = /^\d+$/.test(clean);

  const [doc, setDoc] = useState(isNumeric ? clean : "");
  const [name, setName] = useState(!isNumeric ? clean : "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [loyaltyEnrolled, setLoyaltyEnrolled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCorporate = isLegalEntityCuit(doc);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc.trim() || !name.trim()) {
      setErrorMsg("DNI / Identificador y Nombre son campos requeridos.");
      return;
    }

    if (isCorporate) {
      setErrorMsg("No se pueden registrar empresas ni CUITs jurídicos (prefijos 30, 33, etc.). Solo personas humanas (DNI o CUIL personal).");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const formattedBirthDate =
      birthDay && birthMonth ? `${birthMonth}-${birthDay}` : undefined;

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_number: doc.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          birth_date: formattedBirthDate,
          loyalty_enrolled: loyaltyEnrolled,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al registrar cliente");
      }

      onCustomerCreated(data.customer);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al registrar cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-dark-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-bumeran-500/10 border border-bumeran-500/30 flex items-center justify-center text-bumeran-500 dark:text-bumeran-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Alta Rápida de Comensal</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">2 Clics para comenzar a sumar puntos</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              DNI / CUIL Personal (Personas Humanas) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              autoFocus
              value={doc}
              onChange={(e) => {
                setDoc(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Ej. 32123456 o 20-32123456-9"
              className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-950 border ${
                isCorporate
                  ? "border-amber-500 focus:border-amber-500 focus:ring-amber-500/20"
                  : "border-slate-200 dark:border-dark-750 focus:border-bumeran-500 focus:ring-bumeran-500/20"
              } rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2`}
            />
            {isCorporate && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-start space-x-2 animate-in fade-in">
                <Building2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>CUIT de Empresa detectado:</strong> El programa de fidelización es exclusivo para personas humanas (DNI o CUIL personal). Las personas jurídicas no pueden acumular puntos.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. María González"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-bumeran-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">
                Teléfono / WhatsApp (Opcional)
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 11 ..."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1">
                Correo Electrónico (Opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1 flex items-center justify-between">
              <span>Cumpleaños (Día y Mes - Sin año)</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">🎂 Cortesía anual</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
              >
                <option value="">Día (Opcional)</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d).padStart(2, "0")}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 focus:border-bumeran-500 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none"
              >
                <option value="">Mes (Opcional)</option>
                {[
                  { val: "01", name: "Enero" },
                  { val: "02", name: "Febrero" },
                  { val: "03", name: "Marzo" },
                  { val: "04", name: "Abril" },
                  { val: "05", name: "Mayo" },
                  { val: "06", name: "Junio" },
                  { val: "07", name: "Julio" },
                  { val: "08", name: "Agosto" },
                  { val: "09", name: "Septiembre" },
                  { val: "10", name: "Octubre" },
                  { val: "11", name: "Noviembre" },
                  { val: "12", name: "Diciembre" },
                ].map((m) => (
                  <option key={m.val} value={m.val}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950/60 border border-slate-200 dark:border-dark-800">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={loyaltyEnrolled}
                onChange={(e) => setLoyaltyEnrolled(e.target.checked)}
                className="rounded border-slate-300 dark:border-dark-700 text-bumeran-500 focus:ring-bumeran-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-200">
                Adherir al programa de fidelidad (sumar puntos por consumos)
              </span>
            </label>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-bumeran-500/10 border border-bumeran-500/20 text-bumeran-700 dark:text-bumeran-300 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-bumeran-500 dark:text-bumeran-400 shrink-0" />
            <span>Sincronización automática activa: el cliente se dará de alta también en Fudo POS</span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:hover:bg-dark-750 dark:text-gray-300 border border-slate-200 dark:border-transparent text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCorporate}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-bumeran-600 disabled:hover:to-amber-600 text-white text-xs font-bold transition-all shadow-glow flex items-center justify-center space-x-1.5"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Dar de Alta & Seleccionar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NewCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
  initialQuery = "",
}: NewCustomerModalProps) {
  if (!isOpen) return null;

  return (
    <NewCustomerForm
      key={initialQuery}
      onClose={onClose}
      onCustomerCreated={onCustomerCreated}
      initialQuery={initialQuery}
    />
  );
}
