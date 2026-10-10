"use client";

import React, { useState } from "react";
import { Sparkles, Smartphone, ArrowRight } from "lucide-react";

interface PortalLoginPromptProps {
  onSearchCard: (dni: string, remember: boolean) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export function PortalLoginPrompt({
  onSearchCard,
  isLoading,
  errorMessage,
}: PortalLoginPromptProps) {
  const [inputValue, setInputValue] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    onSearchCard(inputValue.trim(), rememberMe);
  };

  const handleQuickDemo = (dni: string) => {
    setInputValue(dni);
    onSearchCard(dni, rememberMe);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-dark-900/90 border border-slate-200 dark:border-amber-500/30 p-6 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl text-center">
        {/* Glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-dark-950 font-black text-3xl shadow-xl shadow-amber-500/20 mx-auto mb-4">
          🔁
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Mi Tarjeta Digital
        </h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
          Accedé a tus puntos, sellos de visita y canjes exclusivos sin descargar aplicaciones ni contraseñas.
        </p>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/40 text-xs text-red-700 dark:text-red-200 text-left animate-in fade-in duration-150">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="text-left">
            <label
              htmlFor="dni-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5"
            >
              Ingresá tu DNI o Teléfono
            </label>
            <div className="relative">
              <input
                id="dni-input"
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ej: 30123456"
                disabled={isLoading}
                className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-gray-700/80 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 font-mono text-base outline-none transition"
                autoFocus
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-dark-950 font-bold transition flex items-center justify-center cursor-pointer"
                title="Consultar tarjeta"
              >
                {isLoading ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember on device checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-left select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-dark-950 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-amber-500"
            />
            <span className="text-xs text-slate-600 dark:text-gray-300">
              Recordar mi tarjeta en este teléfono
            </span>
          </label>

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-dark-950 font-extrabold text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Buscando tu tarjeta...</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                <span>Ver Mi Tarjeta</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Selector */}
        <div className="mt-8 pt-5 border-t border-slate-200 dark:border-gray-800 text-left">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider block mb-2.5">
            Comensales Demo para Probar:
          </span>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleQuickDemo("30123456")}
              className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-dark-800/80 dark:hover:bg-dark-800 border border-slate-200 dark:border-gray-700/60 hover:border-amber-400/50 text-left transition flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 dark:text-gray-200 dark:group-hover:text-amber-300 transition">
                  Martín Fierro
                </p>
                <p className="text-[10px] text-slate-500 dark:text-gray-400">DNI: 30123456 • 12 Visitas (VIP Black)</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/30">
                Probar
              </span>
            </button>

            <button
              onClick={() => handleQuickDemo("28456789")}
              className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-dark-800/80 dark:hover:bg-dark-800 border border-slate-200 dark:border-gray-700/60 hover:border-amber-400/50 text-left transition flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 dark:text-gray-200 dark:group-hover:text-amber-300 transition">
                  Sofía Rossi
                </p>
                <p className="text-[10px] text-slate-500 dark:text-gray-400">DNI: 28456789 • 6 Visitas (Oro)</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/30">
                Probar
              </span>
            </button>

            <button
              onClick={() => handleQuickDemo("33987654")}
              className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-dark-800/80 dark:hover:bg-dark-800 border border-slate-200 dark:border-gray-700/60 hover:border-amber-400/50 text-left transition flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 dark:text-gray-200 dark:group-hover:text-amber-300 transition">
                  Lucas González
                </p>
                <p className="text-[10px] text-slate-500 dark:text-gray-400">DNI: 33987654 • 2 Visitas (Plata)</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/30">
                Probar
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
