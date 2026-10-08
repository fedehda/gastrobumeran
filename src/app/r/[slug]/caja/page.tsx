"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, Delete, Store, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function TerminalCajaPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [pin, setPin] = useState("");
  const [restaurant, setRestaurant] = useState<{
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    primary_color?: string;
  } | null>(null);
  const [isLoadingResto, setIsLoadingResto] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load restaurant info by slug
  useEffect(() => {
    if (!slug) return;
    setIsLoadingResto(true);
    fetch(`/api/r/${slug}/info`)
      .then((res) => {
        if (!res.ok) throw new Error("Restaurante no encontrado");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.restaurant) {
          setRestaurant(data.restaurant);
        } else {
          setError(data.error || "Restaurante no encontrado");
        }
      })
      .catch((err) => {
        setError(err.message || "Error al cargar terminal");
      })
      .finally(() => {
        setIsLoadingResto(false);
      });
  }, [slug]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
  };

  const handleSubmitPin = async (pinToSubmit?: string) => {
    const effectivePin = pinToSubmit || pin;
    if (effectivePin.length !== 4) {
      setError("El PIN debe tener 4 dígitos.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/terminal-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: effectivePin,
          slug,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "PIN incorrecto");
      }

      // Success: redirect to admin POS dashboard
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
      setPin("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit when 4th digit is entered
  useEffect(() => {
    if (pin.length === 4) {
      handleSubmitPin(pin);
    }
  }, [pin]);

  if (isLoadingResto) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs">Cargando terminal de caja...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between max-w-md mx-auto w-full pt-4">
        <div className="flex items-center space-x-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
            style={{ backgroundColor: restaurant?.primary_color || "#f59e0b" }}
          >
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">
              {restaurant?.name || "Terminal de Caja"}
            </h1>
            <p className="text-[11px] text-slate-400">Punto de Cobro & Fidelización</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Segura</span>
        </div>
      </header>

      {/* Main Terminal Screen */}
      <main className="max-w-xs mx-auto w-full my-auto flex flex-col items-center">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Ingresá tu PIN de Operador</h2>
          <p className="text-xs text-slate-400 mt-1">
            Identificate con tu código numérico de 4 dígitos
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? "bg-amber-400 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                    : "bg-slate-800 border border-slate-700"
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full mb-4 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigit(digit)}
              className="h-16 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-amber-500/20 active:border-amber-500/50 border border-slate-700/60 text-2xl font-bold text-white shadow-md transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleClear}
            className="h-16 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider transition-all flex items-center justify-center"
          >
            Limpiar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigit("0")}
            className="h-16 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-amber-500/20 active:border-amber-500/50 border border-slate-700/60 text-2xl font-bold text-white shadow-md transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-600 border border-slate-700/60 text-slate-300 shadow-md transition-all flex items-center justify-center"
            aria-label="Borrar dígito"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {isSubmitting && (
          <div className="mt-4 flex items-center space-x-2 text-xs text-amber-400">
            <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Validando operador...</span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 max-w-md mx-auto w-full pb-4">
        GastroBumeran Cloud • Terminal Scoped v2.0
      </footer>
    </div>
  );
}
