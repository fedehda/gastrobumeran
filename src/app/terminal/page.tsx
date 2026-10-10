"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Smartphone } from "lucide-react";

export default function TerminalRedirectPage() {
  const router = useRouter();
  const [slugInput, setSlugInput] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check if staff session is already active
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user?.restaurant_slug) {
          router.replace(`/r/${data.user.restaurant_slug}/caja`);
        } else {
          setIsCheckingSession(false);
        }
      })
      .catch(() => {
        setIsCheckingSession(false);
      });
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = slugInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cleanSlug) return;
    router.push(`/r/${cleanSlug}/caja`);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Conectando a tu terminal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between p-6 font-sans">
      <header className="max-w-md mx-auto w-full pt-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm">
            🔁
          </div>
          <span className="font-bold text-white text-base">GastroBumeran</span>
        </Link>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          Terminal Móvil
        </span>
      </header>

      <main className="max-w-sm mx-auto w-full my-auto text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg">
          <Smartphone className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-white">Abrir Terminal de Caja & Mozo</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Ingresá el identificador (slug) de tu local para abrir el escáner de QR y canjes en este teléfono:
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Identificador del Restaurante
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="ej: demo, napoli, la-guitarrita"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-white placeholder-slate-500 text-sm outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!slugInput.trim()}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Continuar a Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-xs text-slate-500">
          <span>¿Querés probar una demo? </span>
          <button
            type="button"
            onClick={() => router.push("/r/demo/caja")}
            className="text-amber-400 hover:underline font-semibold"
          >
            Abrir demo
          </button>
        </div>
      </main>

      <footer className="text-center text-[11px] text-slate-500 pb-2">
        GastroBumeran Cloud • Terminal Scoped v2.0
      </footer>
    </div>
  );
}
