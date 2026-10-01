"use client";

import React, { useState } from "react";
import { UserPlus, X, Check, AlertCircle } from "lucide-react";
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
  const [birthDate, setBirthDate] = useState("");
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

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_number: doc.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          birth_date: birthDate.trim() || undefined,
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
              <span>Fecha de Cumpleaños (Opcional)</span>
              <span className="text-[10px] text-amber-400 font-normal">🎂 Habilita postre de cortesía anual</span>
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 focus:border-bumeran-500 rounded-xl text-white text-xs focus:outline-none"
            />
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
