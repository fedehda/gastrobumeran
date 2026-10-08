"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Share2,
  LogOut,
  QrCode,
  ShieldCheck,
  Smartphone,
  MessageSquare,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  RefreshCw,
  Store,
  Calendar,
  Phone,
  User,
  ArrowRight,
} from "lucide-react";
import { CustomerPortalCard } from "@/types/loyalty";
import { LoyaltyCardVisual } from "@/components/portal/LoyaltyCardVisual";
import { DynamicQrModal } from "@/components/portal/DynamicQrModal";
import { CustomerRewardsCatalog } from "@/components/portal/CustomerRewardsCatalog";
import { CustomerHistoryList } from "@/components/portal/CustomerHistoryList";
import { ThemeToggle } from "@/components/ThemeToggle";

interface RestaurantBranding {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color: string;
  secondary_color?: string | null;
  currency_symbol?: string;
}

export default function RestaurantCustomerPortalPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  // Restaurant State
  const [restaurant, setRestaurant] = useState<RestaurantBranding | null>(null);
  const [loadingResto, setLoadingResto] = useState(true);

  // Card & Auth State
  const [cardData, setCardData] = useState<CustomerPortalCard | null>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals & UI Toggles
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"LOGIN" | "ENROLL">("LOGIN");

  // Login Form
  const [loginDni, setLoginDni] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [otpChannel, setOtpChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");

  // OTP Verification Form
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Enrollment Form
  const [enrollDoc, setEnrollDoc] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollPhone, setEnrollPhone] = useState("");
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrollBirthDate, setEnrollBirthDate] = useState("");
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);

  const isSharingRef = useRef(false);

  // LocalStorage Key scoped to this restaurant
  const storageKey = `gastrobumeran_card_${slug}`;

  // 1. Fetch restaurant public branding info
  useEffect(() => {
    if (!slug) return;
    setLoadingResto(true);
    fetch(`/api/r/${slug}/info`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.restaurant) {
          setRestaurant(data.restaurant);
        } else {
          setErrorMessage(data.error || "Restaurante no encontrado.");
        }
      })
      .catch((err) => {
        console.error("Error fetching restaurant info:", err);
        setErrorMessage("Error de conexión al cargar el local.");
      })
      .finally(() => setLoadingResto(false));
  }, [slug]);

  // 2. Load Customer Card function
  const loadCard = useCallback(
    async (dni: string) => {
      if (!slug || !dni) return;
      setIsLoadingCard(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/r/${slug}/card?dni=${encodeURIComponent(dni)}`);
        const data = await res.json();
        if (data.success && data.card) {
          setCardData(data.card);
          localStorage.setItem(storageKey, JSON.stringify({ dni: data.card.customer.document_number }));
        } else {
          setErrorMessage(data.error || "No encontramos tu tarjeta en este restaurante.");
          setCardData(null);
        }
      } catch (err) {
        console.error("Error loading card:", err);
        setErrorMessage("Error al conectar con el servidor.");
      } finally {
        setIsLoadingCard(false);
      }
    },
    [slug, storageKey]
  );

  // 3. Try Auto-restore session from scoped localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.dni) {
          setLoginDni(parsed.dni);
          loadCard(parsed.dni);
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, [slug, storageKey, loadCard]);

  // 4. Request OTP Handler
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginDni.trim()) {
      setErrorMessage("Por favor ingresá tu número de DNI.");
      return;
    }

    setIsLoadingCard(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/r/${slug}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REQUEST",
          dni: loginDni.trim(),
          phone: loginPhone.trim() || undefined,
          channel: otpChannel,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDemoOtpCode(data.demoCode || null);
        setOtpExpiresAt(data.expiresAt || null);
        setIsOtpModalOpen(true);
        setSuccessMessage(`Código enviado vía ${otpChannel === "WHATSAPP" ? "WhatsApp" : "SMS"}.`);
      } else {
        setErrorMessage(data.error || "No se pudo enviar el código de verificación.");
      }
    } catch (err) {
      console.error("Error requesting OTP:", err);
      setErrorMessage("Error de red al solicitar código de verificación.");
    } finally {
      setIsLoadingCard(false);
    }
  };

  // 5. Verify OTP Handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setIsVerifyingOtp(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/r/${slug}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY",
          dni: loginDni.trim(),
          code: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.verified) {
        setIsOtpModalOpen(false);
        setOtpCode("");
        // Load card and persist session
        await loadCard(loginDni.trim());
      } else {
        setErrorMessage(data.error || "Código incorrecto o vencido.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setErrorMessage("Error de conexión al verificar código.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // 6. Enroll New Customer Handler
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollDoc.trim() || !enrollName.trim()) {
      setErrorMessage("DNI y Nombre son obligatorios.");
      return;
    }

    setIsSubmittingEnroll(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/r/${slug}/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_number: enrollDoc.trim(),
          name: enrollName.trim(),
          phone: enrollPhone.trim() || undefined,
          email: enrollEmail.trim() || undefined,
          birth_date: enrollBirthDate || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.card) {
        setCardData(data.card);
        localStorage.setItem(storageKey, JSON.stringify({ dni: data.card.customer.document_number }));
        setSuccessMessage(data.message || "¡Bienvenido al programa de fidelización!");
        setActiveTab("LOGIN");
      } else {
        setErrorMessage(data.error || "No se pudo completar el registro.");
      }
    } catch (err) {
      console.error("Error enrolling:", err);
      setErrorMessage("Error al registrarte en el restaurante.");
    } finally {
      setIsSubmittingEnroll(false);
    }
  };

  // 7. Logout handler
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    setCardData(null);
    setLoginDni("");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // 8. Share Card Handler
  const handleShareCard = async () => {
    if (!cardData || isSharingRef.current) return;
    isSharingRef.current = true;

    const title = `Mi Tarjeta en ${restaurant?.name || "GastroBumeran"}`;
    const text = `Tengo ${cardData.customer.points_balance} puntos acumulados en ${restaurant?.name}!`;
    const url = window.location.href;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled share
      } finally {
        isSharingRef.current = false;
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setSuccessMessage("¡Enlace copiado al portapapeles!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error("Clipboard error:", err);
      } finally {
        isSharingRef.current = false;
      }
    }
  };

  if (loadingResto) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm text-slate-400">Cargando restaurante...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto text-2xl font-black">
            ✕
          </div>
          <h2 className="text-2xl font-black">Local no encontrado</h2>
          <p className="text-sm text-slate-400">
            El restaurante solicitado (<strong>{slug}</strong>) no existe o no se encuentra activo.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = restaurant.primary_color || "#F59E0B";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {restaurant.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight">
                {restaurant.name}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>Club de Fidelidad</span>
                <span>•</span>
                <span className="text-emerald-500 font-medium">Oficial</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {cardData && (
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-xs flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <p className="flex-1">{successMessage}</p>
          </div>
        )}

        {!cardData ? (
          /* ============================================================ */
          /* NO CARD LOADED: LOGIN / ENROLL VIEW                          */
          /* ============================================================ */
          <div className="max-w-md mx-auto space-y-6 pt-4 sm:pt-8">
            {/* Header Hero */}
            <div className="text-center space-y-2">
              <div
                className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white text-2xl font-black shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                🔁
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {restaurant.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Acumulá puntos en cada consumo, ganá cortesías exclusivas y disfrutá de premios gastronómicos.
              </p>
            </div>

            {/* Toggle Tabs */}
            <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("LOGIN")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === "LOGIN"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Ya soy comensal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ENROLL")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === "ENROLL"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Quiero sumarme
              </button>
            </div>

            {/* TAB 1: LOGIN WITH DNI & OTP */}
            {activeTab === "LOGIN" && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    Acceso Seguro a tu Tarjeta
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Ingresá tu DNI para verificar tu identidad y abrir tu saldo y premios.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Número de DNI
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 35123456"
                      value={loginDni}
                      onChange={(e) => setLoginDni(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Canal de Verificación OTP
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOtpChannel("WHATSAPP")}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                          otpChannel === "WHATSAPP"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpChannel("SMS")}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                          otpChannel === "SMS"
                            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-blue-500" />
                        SMS
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoadingCard || !loginDni.trim()}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-slate-950 flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isLoadingCard ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Solicitar Código de Acceso</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: ENROLL NEW DINER */}
            {activeTab === "ENROLL" && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-amber-500" />
                    Adhesión al Club
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Completá tus datos para abrir tu tarjeta digital en {restaurant.name}.
                  </p>
                </div>

                <form onSubmit={handleEnrollSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Nombre y Apellido *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Ej: Lucía Martínez"
                        value={enrollName}
                        onChange={(e) => setEnrollName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      DNI (Documento de Identidad) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 35123456"
                      value={enrollDoc}
                      onChange={(e) => setEnrollDoc(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Teléfono (WhatsApp)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          placeholder="Ej: 1145678900"
                          value={enrollPhone}
                          onChange={(e) => setEnrollPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Cumpleaños (Opcional)
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="date"
                          value={enrollBirthDate}
                          onChange={(e) => setEnrollBirthDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingEnroll}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-slate-950 flex items-center justify-center gap-2 shadow-lg transition mt-4 disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isSubmittingEnroll ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Adherirme y Abrir mi Tarjeta</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Cashier Link */}
            <div className="text-center pt-2">
              <Link
                href={`/r/${slug}/caja`}
                className="text-xs text-slate-500 hover:text-amber-500 dark:text-slate-400 transition inline-flex items-center gap-1"
              >
                <Store className="w-3.5 h-3.5" />
                <span>¿Sos personal del local? Ir a terminal de caja</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* CARD LOADED: CUSTOMER LOYALTY CARD PORTAL                    */
          /* ============================================================ */
          <div className="space-y-6">
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Comensal Registrado
                </span>
                <h2 className="text-xl sm:text-2xl font-black">
                  Hola, {cardData.customer.name.split(" ")[0]}!
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareCard}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Compartir</span>
                </button>
                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-slate-950 flex items-center gap-1.5 shadow-md transition"
                  style={{ backgroundColor: primaryColor }}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Mi QR</span>
                </button>
              </div>
            </div>

            {/* Visual Loyalty Card */}
            <LoyaltyCardVisual cardData={cardData} onOpenQr={() => setIsQrModalOpen(true)} />

            {/* Rewards Catalog */}
            <div className="pt-2">
              <CustomerRewardsCatalog
                rewardsProgress={cardData.rewards_progress}
                onOpenQr={() => setIsQrModalOpen(true)}
              />
            </div>

            {/* Points History */}
            <div className="pt-2">
              <CustomerHistoryList history={cardData.recent_history} />
            </div>

            {/* Footer Notice */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-center space-y-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Puntos válidos exclusivamente en <strong>{restaurant.name}</strong>.
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                GastroBumeran Loyalty OS • Programa de fidelización gastronómica
              </p>
            </div>
          </div>
        )}
      </main>

      {/* OTP MODAL */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-sm w-full p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg">Ingresá el Código</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enviamos un código de 6 dígitos vía {otpChannel === "WHATSAPP" ? "WhatsApp" : "SMS"}.
              </p>

              {demoOtpCode && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/30 text-xs text-amber-800 dark:text-amber-200 font-medium">
                  Modo demostración: Tu código es <strong>{demoOtpCode}</strong> (o 123456)
                </div>
              )}
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  autoFocus
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full py-3 text-center tracking-[0.5em] text-2xl font-black rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOtpModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length < 6}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition disabled:opacity-50"
                >
                  {isVerifyingOtp ? "Verificando..." : "Verificar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC QR MODAL */}
      {cardData && (
        <DynamicQrModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          qrPayload={cardData.qr_payload}
          customerName={cardData.customer.name}
          documentNumber={cardData.customer.document_number}
          pointsBalance={cardData.customer.points_balance}
        />
      )}
    </div>
  );
}
