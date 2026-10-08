"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  User,
  MapPin,
  ExternalLink,
} from "lucide-react";

export default function RegisterRestaurantPage() {
  const router = useRouter();

  // Form fields
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [cuit, setCuit] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [posSystem, setPosSystem] = useState("FUDO");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    restaurantName: string;
    slug: string;
    verificationUrl: string;
  } | null>(null);

  // Auto-generate slug when restaurant name changes (unless user manually edited slug)
  const [isManualSlug, setIsManualSlug] = useState(false);

  useEffect(() => {
    if (isManualSlug || !restaurantName.trim()) return;

    const timer = setTimeout(() => {
      fetch(`/api/restaurants/check-slug?name=${encodeURIComponent(restaurantName.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.slug) {
            setSlug(data.slug);
            setSlugAvailable(true);
          }
        })
        .catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [restaurantName, isManualSlug]);

  // Check custom slug availability
  const checkSlugLive = (candidateSlug: string) => {
    if (!candidateSlug.trim()) {
      setSlugAvailable(null);
      return;
    }
    setIsCheckingSlug(true);
    fetch(`/api/restaurants/check-slug?slug=${encodeURIComponent(candidateSlug.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSlugAvailable(data.available);
        }
      })
      .catch(() => {})
      .finally(() => setIsCheckingSlug(false));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(val);
    setIsManualSlug(true);
    checkSlugLive(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!restaurantName.trim()) {
      setError("Ingresá el nombre de tu restaurante.");
      return;
    }
    if (!slug.trim()) {
      setError("Ingresá un enlace personalizado para tu local.");
      return;
    }
    if (slugAvailable === false) {
      setError("El enlace seleccionado ya está ocupado. Elegí otro.");
      return;
    }
    if (!adminName.trim()) {
      setError("Ingresá tu nombre y apellido.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Ingresá un email válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: restaurantName.trim(),
          slug: slug.trim(),
          cuit: cuit.trim() || undefined,
          city: city.trim() || undefined,
          phone: phone.trim() || undefined,
          pos_system: posSystem,
          admin_name: adminName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al registrar el restaurante");
      }

      setSuccessData({
        restaurantName: data.restaurant.name,
        slug: data.restaurant.slug,
        verificationUrl: data.verificationUrl,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado al registrarse");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800/80">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-bumeran-600 to-amber-500 flex items-center justify-center font-black text-white text-xl shadow-glow">
            G
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">GastroBumeran</span>
            <span className="block text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Cloud Multi-Tenant</span>
          </div>
        </Link>
        <Link
          href="/ingresar"
          className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-xl border border-slate-700/80 hover:bg-slate-800/60"
        >
          ¿Ya tenés cuenta? Ingresar
        </Link>
      </header>

      {/* Main Registration Area */}
      <main className="max-w-2xl mx-auto w-full py-8 my-auto">
        {successData ? (
          /* Success Screen */
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] backdrop-blur-xl text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                ¡Alta Exitosa en Modo Demo!
              </span>
              <h1 className="text-2xl font-black text-white mt-3">
                ¡Bienvenido a GastroBumeran, {successData.restaurantName}!
              </h1>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                Tu restaurante fue dado de alta con <strong>50 clientes y 100 ventas de prueba gratuitas</strong>. El portal de tus comensales estará disponible en:
              </p>
              <div className="mt-3 inline-block px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-400">
                gastrobumeran.com/r/{successData.slug}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2">
              <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Verificación de Correo (Simulada para Pruebas):</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                En producción se envía un correo a tu casilla. Para esta prueba puedes activar tu cuenta directamente haciendo click en el siguiente enlace:
              </p>
              <Link
                href={successData.verificationUrl}
                className="inline-flex items-center space-x-1 text-amber-400 hover:text-amber-300 underline font-medium text-xs break-all"
              >
                <span>{successData.verificationUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/admin/onboarding"
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-500 hover:from-bumeran-500 hover:to-amber-400 text-white font-bold text-sm shadow-glow transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Configurar Mi Restaurante</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/admin"
                className="py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-sm transition-all flex items-center justify-center"
              >
                Ir a la Caja
              </Link>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 text-center sm:text-left">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Prueba Gratuita Sin Tarjeta</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Registrá tu Restaurante
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Creá tu cuenta en menos de 2 minutos y empezá a fidelizar a tus comensales hoy mismo.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Bloque 1: Datos del Local */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Store className="w-4 h-4" />
                  <span>1. Identidad de tu Restaurante</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Nombre del Local *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Pizzería Napoli"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Enlace Web / Slug *
                    </label>
                    <div className="relative">
                      <div className="flex rounded-xl bg-slate-950 border border-slate-800 focus-within:ring-2 focus-within:ring-amber-500/50 overflow-hidden">
                        <span className="px-2.5 py-2.5 bg-slate-900 text-slate-500 text-xs font-mono select-none">
                          /r/
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="pizzeria-napoli"
                          value={slug}
                          onChange={handleSlugChange}
                          className="w-full px-2 py-2 bg-transparent text-white placeholder-slate-500 text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div className="absolute right-2.5 top-2.5 text-[10px]">
                        {isCheckingSlug ? (
                          <span className="text-slate-400">Verificando...</span>
                        ) : slugAvailable === true ? (
                          <span className="text-emerald-400 font-semibold">✓ Disponible</span>
                        ) : slugAvailable === false ? (
                          <span className="text-rose-400 font-semibold">✗ En uso</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      CUIT / RUT (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="30-71234567-8"
                      value={cuit}
                      onChange={(e) => setCuit(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Ciudad / Barrio
                    </label>
                    <input
                      type="text"
                      placeholder="Rosario, Santa Fe"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Sistema POS en Uso
                    </label>
                    <select
                      value={posSystem}
                      onChange={(e) => setPosSystem(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="FUDO">Fudo POS</option>
                      <option value="MAXIREST">Maxirest</option>
                      <option value="BISTRO">BistroSoft</option>
                      <option value="EXCEL">Planillas CSV / Excel</option>
                      <option value="OTHER">Otro Sistema</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloque 2: Cuenta de Administrador */}
              <div className="space-y-4 pt-3 border-t border-slate-800/80">
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-4 h-4" />
                  <span>2. Cuenta del Administrador / Dueño</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Marcelo Rossi"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+54 9 341 555-0199"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email Corporativo (Usuario) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="marcelo@napoli.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Contraseña (Mín. 6 caracteres) *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Botón de Envío */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-500 hover:from-bumeran-500 hover:to-amber-400 active:scale-[0.99] text-white font-bold text-sm shadow-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creando restaurante...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Comenzar Prueba Gratis Demo</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-3">
                  Al registrarte aceptás los términos de servicio de GastroBumeran. Modo Demo sin costo ni compromiso.
                </p>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
        GastroBumeran Cloud • Fidelización Multi-Restaurante v2.0
      </footer>
    </div>
  );
}
