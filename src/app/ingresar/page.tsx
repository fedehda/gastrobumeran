"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Store,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function IngresarPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ADMIN" | "TERMINAL">("ADMIN");

  // Admin Login State
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Terminal PIN State
  const [terminalSlug, setTerminalSlug] = useState("");
  const [terminalPin, setTerminalPin] = useState("");
  const [terminalLoading, setTerminalLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAdminLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail.trim(),
          password: adminPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/admin");
      } else {
        setErrorMessage(data.error || "Credenciales incorrectas.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage("Error de conexión al iniciar sesión.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setTerminalLoading(true);

    try {
      const cleanSlug = terminalSlug.trim().toLowerCase();
      const cleanPin = terminalPin.trim();

      const res = await fetch("/api/auth/terminal-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: cleanSlug,
          pin: cleanPin,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Redirect directly to cashier terminal for that restaurant
        router.push(`/r/${cleanSlug}/caja`);
      } else {
        setErrorMessage(data.error || "Restaurante o PIN incorrecto.");
      }
    } catch (err) {
      console.error("Terminal login error:", err);
      setErrorMessage("Error de conexión al autenticar terminal.");
    } finally {
      setTerminalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors">
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 backdrop-blur-md bg-white/70 dark:bg-slate-950/70">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-amber-500/20">
            🔁
          </div>
          <span className="font-black text-lg tracking-tight bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
            GastroBumeran
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/registro"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Crear cuenta de restaurante
          </Link>
        </div>
      </header>

      {/* Center Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Ingresar al Sistema
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Seleccioná tu método de acceso para continuar
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab("ADMIN");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === "ADMIN"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>Panel Backoffice</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("TERMINAL");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === "TERMINAL"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Store className="w-4 h-4 text-emerald-500" />
              <span>Terminal de Caja</span>
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-300 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Form Container */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
            {activeTab === "ADMIN" ? (
              /* TAB 1: ADMIN LOGIN */
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="admin@tu-restaurante.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 mt-6"
                >
                  {adminLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Iniciar Sesión en Panel</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* TAB 2: TERMINAL PIN LOGIN */
              <form onSubmit={handleTerminalSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Identificador / Slug del Local
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ej: resto-demo-default"
                      value={terminalSlug}
                      onChange={(e) => setTerminalSlug(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Es el identificador que aparece en el enlace de tu restaurante (/r/slug).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    PIN Numérico de Caja (4 a 6 dígitos)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      maxLength={6}
                      placeholder="••••"
                      value={terminalPin}
                      onChange={(e) => setTerminalPin(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={terminalLoading || !terminalSlug.trim() || terminalPin.length < 4}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 mt-6"
                >
                  {terminalLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Abrir Terminal de Caja</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer Registration Notice */}
          <div className="text-center p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              ¿Querés implementar GastroBumeran en tu restaurante?{" "}
            </span>
            <Link
              href="/registro"
              className="font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              Comenzá 14 días gratis
              <Sparkles className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800">
        GastroBumeran Loyalty OS • Plataforma Multi-Tenant Cloud
      </footer>
    </div>
  );
}
