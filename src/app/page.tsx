"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Zap,
  CheckCircle2,
  ArrowRight,
  Store,
  Smartphone,
  Gift,
  Users,
  PieChart,
  ChevronRight,
  MessageSquare,
  Building2,
  Calendar,
  Clock,
  Send,
  HelpCircle,
  X,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Lead Form State
  const [leadName, setLeadName] = useState("");
  const [leadResto, setLeadResto] = useState("");
  const [leadBranches, setLeadBranches] = useState("1");
  const [leadPos, setLeadPos] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadSubmitting(true);
    setLeadError(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName.trim(),
          restaurant_name: leadResto.trim(),
          branch_count: Number(leadBranches) || 1,
          pos_system: leadPos.trim() || undefined,
          phone: leadPhone.trim(),
          email: leadEmail.trim(),
          message: leadMessage.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLeadSuccess(true);
        setLeadName("");
        setLeadResto("");
        setLeadPhone("");
        setLeadEmail("");
        setLeadMessage("");
      } else {
        setLeadError(data.error || "No se pudo enviar el formulario.");
      }
    } catch (err) {
      console.error("Lead submission error:", err);
      setLeadError("Error de red al enviar tus datos. Intentá nuevamente.");
    } finally {
      setLeadSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-amber-500 selection:text-slate-950 transition-colors">
      {/* ============================================================ */}
      {/* HEADER / NAVIGATION                                          */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-amber-500/20">
              🔁
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 dark:from-amber-400 dark:to-amber-500 bg-clip-text text-transparent">
              GastroBumeran
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#caracteristicas" className="hover:text-amber-500 transition">
              Características
            </a>
            <a href="#como-funciona" className="hover:text-amber-500 transition">
              Cómo Funciona
            </a>
            <a href="#precios" className="hover:text-amber-500 transition">
              Planes
            </a>
            <a href="#contacto" className="hover:text-amber-500 transition">
              Contacto
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            {/* Modal trigger: Soy Cliente */}
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-500" />
              <span>Soy Cliente</span>
            </button>

            {/* Centralized Login */}
            <Link
              href="/ingresar"
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-amber-500 transition hidden sm:inline-block"
            >
              Ingresar
            </Link>

            {/* Restaurant Registration CTA */}
            <Link
              href="/registro"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Probar Gratis</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* HERO SECTION                                                 */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold tracking-wide">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>SaaS de Fidelización Multi-Restaurante</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-slate-950 dark:text-white">
              El Sistema de Fidelización Gastronómica que{" "}
              <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 bg-clip-text text-transparent">
                multiplica comensales recurrentes
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Motor híbrido de <strong>Puntos y Frecuencia</strong> con sincronización en tiempo real a tu POS. Tus clientes acceden a su tarjeta digital con su DNI sin descargar ninguna aplicación.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                href="/registro"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2 group"
              >
                <span>Comenzar Prueba Gratis (14 Días)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </Link>
              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex items-center justify-center gap-2 shadow-sm"
              >
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span>¿Cómo funciona para clientes?</span>
              </button>
            </div>

            {/* Metric Proof Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-8 max-w-2xl mx-auto text-left">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
                <div className="text-2xl font-black text-amber-500">+34%</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Recurrencia de mesas en los primeros 60 días
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
                <div className="text-2xl font-black text-emerald-500">0 Apps</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Cero fricción: DNI + QR en mesa o ticket fiscal
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
                <div className="text-2xl font-black text-blue-500">Anti-Inflación</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Caducidad dual y pasivo contable en pesos reales
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4 VALUE PILLARS                                              */}
      {/* ============================================================ */}
      <section id="caracteristicas" className="py-16 sm:py-24 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Diseñado específicamente para la dinámica de un restaurante
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              A diferencia de programas genéricos de puntos, GastroBumeran resuelve la rotación de mesas, las anulaciones en caja y la inflación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl font-black">
                🔁
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Motor Híbrido Puntos + Visitas
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Premia tanto el consumo en dinero como la frecuencia física. Configurá consumo mínimo para validar visita y cooldown de horas entre asistencias.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl font-black">
                ⚡
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Sincronización POS & Webhooks
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Integración nativa con Fudo y sistemas POS. Ingesta idempotente de ventas cerradas y reversión automática ante anulaciones en caja.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl font-black">
                🛡️
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Tarjeta Digital con OTP
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tus clientes consultan su balance con DNI y código de seguridad de un solo uso por WhatsApp o SMS. Sin contraseñas que olvidar.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xl font-black">
                📊
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Inteligencia RFM & Pasivo
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Segmentación automática de comensales en Champions, En Riesgo y Dormidos. Monitoreo del costo real de tus premios para proteger tu margen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CÓMO FUNCIONA                                                */}
      {/* ============================================================ */}
      <section id="como-funciona" className="py-16 sm:py-24 bg-white dark:bg-slate-900/40 border-t border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Poné a funcionar tu club de fidelidad en 3 pasos
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Sin desarrollos a medida ni compras de equipamiento costoso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative space-y-3">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center mb-4">
                1
              </span>
              <h3 className="font-bold text-lg">Registrá tu Local</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Elegí el slug de tu restaurante (ej. /r/tu-local), tus colores de marca y configurá cuántos puntos otorgás por cada \$100 consumidos.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative space-y-3">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center mb-4">
                2
              </span>
              <h3 className="font-bold text-lg">Colocá el Kit de QR en Mesas</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Descargá el material gráfico listo para imprimir o mostralo en tus cartas y tickets fiscales. Cada mesa invita al comensal a sumarse.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative space-y-3">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center mb-4">
                3
              </span>
              <h3 className="font-bold text-lg">Acreditación Automática</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                El cajero ingresa el DNI al cerrar la cuenta en tu POS o escanea la tarjeta digital. Los puntos se emiten en vivo y los clientes regresan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PRICING & PLANS                                              */}
      {/* ============================================================ */}
      <section id="precios" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Planes claros y transparentes
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Comenzá hoy con el modo de prueba gratuito. Activaciones asistidas con nuestro equipo sin requerir tarjeta de crédito.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {/* PLAN 1: STARTER DEMO */}
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Prueba Inicial
                </span>
                <h3 className="text-2xl font-black">Starter Demo</h3>
                <div className="text-3xl font-black">
                  $0{" "}
                  <span className="text-xs font-normal text-slate-500">/ 14 días</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ideal para probar la experiencia con tus clientes y mozos en un turno de prueba.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Hasta 50 comensales registrados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Hasta 100 ventas procesadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Portal comensal web /r/[slug]</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Kit de QR imprimible para mesas</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/registro"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs text-center transition block"
              >
                Comenzar Demo Gratis
              </Link>
            </div>

            {/* PLAN 2: PRO (FEATURED) */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-500 flex flex-col justify-between space-y-6 relative shadow-xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider">
                Recomendado
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Restaurante Individual
                </span>
                <h3 className="text-2xl font-black">Plan Pro</h3>
                <div className="text-3xl font-black">
                  Consultar{" "}
                  <span className="text-xs font-normal text-slate-500">/ mes</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Para restaurantes gastronómicos activos que buscan potenciar su base de comensales.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span><strong>Comensales y ventas ilimitadas</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Sincronización POS Fudo en tiempo real</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Segmentación RFM y cálculo de pasivo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Validación OTP WhatsApp y SMS</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Soporte prioritario por WhatsApp</span>
                  </li>
                </ul>
              </div>

              <a
                href="#contacto"
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs text-center shadow-lg shadow-amber-500/25 transition block"
              >
                Solicitar Activación Pro
              </a>
            </div>

            {/* PLAN 3: CADENAS */}
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Múltiples Locales
                </span>
                <h3 className="text-2xl font-black">Cadena / Franquicias</h3>
                <div className="text-3xl font-black">A Medida</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Para marcas con 2 o más sucursales que requieren reglas unificadas y reportes consolidados.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Múltiples sucursales y franquiciados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Catálogo de premios unificado o por local</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Subdominios dedicados por marca</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Auditoría financiera consolidada</span>
                  </li>
                </ul>
              </div>

              <a
                href="#contacto"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs text-center transition block"
              >
                Hablar con Asesor Corporativo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CONTACT & LEAD FORM                                          */}
      {/* ============================================================ */}
      <section id="contacto" className="py-16 sm:py-24 bg-white dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              ¿Hablamos sobre tu restaurante?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Completá el formulario para recibir una demostración personalizada o activar tu plan.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
            {leadSuccess ? (
              <div className="p-8 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-3xl font-black">
                  ✓
                </div>
                <h3 className="text-2xl font-black">¡Mensaje recibido!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Gracias por tu interés en GastroBumeran. Un asesor gastronómico se pondrá en contacto dentro de las próximas 24 horas hábiles.
                </p>
                <button
                  type="button"
                  onClick={() => setLeadSuccess(false)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Enviar otra consulta
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                {leadError && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-300">
                    {leadError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Nombre del Contacto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Martín Rodríguez"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Nombre del Restaurante *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Pizzería Napoli"
                      value={leadResto}
                      onChange={(e) => setLeadResto(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Teléfono (WhatsApp) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: 11-4567-8900"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="martin@napoli.com"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Cantidad de Sucursales
                    </label>
                    <select
                      value={leadBranches}
                      onChange={(e) => setLeadBranches(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="1">1 sucursal</option>
                      <option value="2">2 a 5 sucursales</option>
                      <option value="6">Más de 5 sucursales</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Sistema POS Actual
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Fudo, Maxirest, Bistro..."
                      value={leadPos}
                      onChange={(e) => setLeadPos(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Mensaje o Consulta (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Contanos tus necesidades o dudas particulares..."
                    value={leadMessage}
                    onChange={(e) => setLeadMessage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {leadSubmitting ? (
                    <span>Enviando información...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Consulta Comercial</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 dark:text-white">GastroBumeran</span>
            <span>•</span>
            <span>Plataforma SaaS de Fidelización Gastronómica</span>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/registro" className="hover:text-amber-500 transition">
              Registrar Restaurante
            </Link>
            <Link href="/ingresar" className="hover:text-amber-500 transition">
              Acceso Backoffice
            </Link>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="hover:text-amber-500 transition"
            >
              Soy Comensal
            </button>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* EDUCATIONAL MODAL: "SOY CLIENTE"                             */}
      {/* ============================================================ */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setIsCustomerModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon & Title */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-3xl font-black">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">
                ¿Cómo ver tus puntos y premios?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cada restaurante gestiona su propio club de fidelización exclusivo.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-xs space-y-0.5">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">
                    Escaneá el QR en tu mesa
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400">
                    Encontrá el cartel o QR en la mesa, carta física o ticket de tu restaurante favorito.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-xs space-y-0.5">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">
                    Ingresá tu DNI
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400">
                    El portal de ese local se abrirá en tu navegador. Podés verificar tu identidad en segundos por WhatsApp o SMS.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="text-xs space-y-0.5">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">
                    Mostrá tu tarjeta al mozo
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400">
                    Presentá tu QR personal o tu DNI al pagar para sumar puntos o canjear tus cortesías.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
