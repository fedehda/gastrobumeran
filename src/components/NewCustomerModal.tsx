"use client";

import React, { useState } from "react";
import { UserPlus, X, Check, AlertCircle, Zap } from "lucide-react";
import { Customer } from "@/types/loyalty";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc.trim() || !name.trim()) {
      setErrorMsg("DNI / Identificador y Nombre son campos requeridos.");
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
      <div className="max-w-md w-full rounded-2xl bg-dark-900 border border-dark-750 p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-dark-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-bumeran-500/10 border border-bumeran-500/30 flex items-center justify-center text-bumeran-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Alta Rápida de Comensal</h3>
              <p className="text-xs text-gray-400">2 Clics para comenzar a sumar puntos</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              DNI / CUIT / Nro. Fiscal *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder="Ej. 30123456"
              className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-bumeran-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. María González"
              className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-bumeran-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Teléfono / WhatsApp (Opcional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 11 ..."
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Correo Electrónico (Opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center justify-between">
              <span>Cumpleaños (Día y Mes - Sin año)</span>
              <span className="text-[10px] text-amber-400 font-normal">🎂 Cortesía anual</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
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
                className="w-full px-3 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
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

          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={loyaltyEnrolled}
                onChange={(e) => setLoyaltyEnrolled(e.target.checked)}
                className="rounded border-dark-700 text-bumeran-500 focus:ring-bumeran-500"
              />
              <span className="text-xs font-semibold text-gray-200">
                Adherir al programa de fidelidad (sumar puntos por consumos)
              </span>
            </label>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-bumeran-500/10 border border-bumeran-500/20 text-bumeran-300 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-bumeran-400 shrink-0" />
            <span>Sincronización automática activa: el cliente se dará de alta también en Fudo POS</span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-glow flex items-center justify-center space-x-1.5"
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
