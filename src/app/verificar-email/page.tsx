"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowRight, Store, Sparkles } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState(token ? "" : "No se especificó un token de verificación.");
  const [restaurantName, setRestaurantName] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          if (data.restaurant?.name) {
            setRestaurantName(data.restaurant.name);
          }
        } else {
          setStatus("error");
          setErrorMessage(data.error || "El enlace de verificación no es válido o ha expirado.");
        }
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message || "Error al verificar correo.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
      <header className="max-w-md mx-auto w-full pt-8 text-center">
        <Link href="/" className="inline-flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-bumeran-600 to-amber-500 flex items-center justify-center font-black text-white text-xl shadow-glow">
            G
          </div>
          <span className="font-bold text-xl tracking-tight text-white">GastroBumeran</span>
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full my-auto">
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl text-center">
          {status === "loading" && (
            <div className="py-8 space-y-4">
              <div className="w-12 h-12 mx-auto border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <h2 className="text-lg font-bold text-white">Verificando tu cuenta...</h2>
              <p className="text-xs text-slate-400">Validando el enlace de activación de tu restaurante.</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-4 space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold">
                  Modo de Prueba Demo Activo
                </span>
                <h2 className="text-xl font-bold text-white mt-2">
                  ¡Cuenta Verificada con Éxito!
                </h2>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {restaurantName ? (
                    <>Tu restaurante <strong className="text-white">{restaurantName}</strong> ya está habilitado en GastroBumeran.</>
                  ) : (
                    "Tu cuenta y restaurante ya se encuentran habilitados para operar."
                  )}
                </p>
              </div>

              <div className="pt-3 flex flex-col gap-2.5">
                <Link
                  href="/admin/onboarding"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-500 hover:from-bumeran-500 hover:to-amber-400 text-white font-bold text-xs shadow-glow transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Configurar mi Restaurante (Asistente)</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/admin"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-semibold text-xs transition-all flex items-center justify-center"
                >
                  <span>Ir Directo al Panel de Caja</span>
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="py-4 space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">No pudimos verificar el enlace</h2>
                <p className="text-xs text-rose-300 mt-1.5 leading-relaxed bg-rose-950/30 border border-rose-800/30 p-3 rounded-xl">
                  {errorMessage}
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/registro"
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all flex items-center justify-center"
                >
                  Volver al Registro
                </Link>
                <Link
                  href="/ingresar"
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  ¿Ya tenés cuenta? Iniciar Sesión
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-md mx-auto w-full pb-8 text-center text-xs text-slate-500">
        GastroBumeran Cloud • Fidelización Gastronómica Inteligente
      </footer>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Cargando verificación...
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
