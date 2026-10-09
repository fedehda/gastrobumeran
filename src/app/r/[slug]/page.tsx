"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Share2,
  LogOut,
  QrCode,
  ShieldCheck,
  Smartphone,
  MessageCircle,
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
  Download,
} from "lucide-react";
import { CustomerPortalCard, RestaurantBranding } from "@/types/loyalty";
import { LoyaltyCardVisual } from "@/components/portal/LoyaltyCardVisual";
import { DynamicQrModal } from "@/components/portal/DynamicQrModal";
import { CustomerRewardsCatalog } from "@/components/portal/CustomerRewardsCatalog";
import { CustomerHistoryList } from "@/components/portal/CustomerHistoryList";
import { ActiveCampaignsBanner } from "@/components/portal/ActiveCampaignsBanner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RestaurantCustomerPortalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || "";
  const urlDni = searchParams?.get("dni") || "";

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
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // PWA Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const isSharingRef = useRef(false);

  // LocalStorage Key scoped to this restaurant
  const storageKey = `gastrobumeran_card_${slug}`;

  // Catch PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

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

  // 2. Load Customer Card
  const loadCardByIdentifier = useCallback(
    async (identifier: string, remember = true) => {
      if (!slug || !identifier.trim()) return;
      setIsLoadingCard(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/r/${slug}/card?query=${encodeURIComponent(identifier.trim())}`);
        const data = await res.json();

        if (data.success && data.card) {
          setCardData(data.card);
          if (remember && typeof window !== "undefined") {
            localStorage.setItem(storageKey, identifier.trim());
          }
        } else {
          setErrorMessage(data.error || "No se encontró tarjeta con ese identificador.");
          setCardData(null);
        }
      } catch (err) {
        console.error("Error loading customer card:", err);
        setErrorMessage("Error de conexión al consultar la tarjeta.");
        setCardData(null);
      } finally {
        setIsLoadingCard(false);
      }
    },
    [slug, storageKey]
  );

  // 3. Auto-load from URL or LocalStorage
  useEffect(() => {
    if (!slug) return;
    const targetDni = urlDni.trim() || (typeof window !== "undefined" ? localStorage.getItem(storageKey) || "" : "");
    if (targetDni) {
      loadCardByIdentifier(targetDni, false);
    }
  }, [slug, urlDni, storageKey, loadCardByIdentifier]);

  // 4. Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginDni.trim() || loginPhone.trim();
    if (!identifier) {
      setErrorMessage("Ingresá tu DNI o número de teléfono.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoadingCard(true);

    try {
      const res = await fetch("/api/portal/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          channel: otpChannel,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsOtpModalOpen(true);
        setDemoOtpCode(data.demoCode || null);
        setSuccessMessage(`Código enviado vía ${otpChannel}.`);
      } else {
        setErrorMessage(data.error || "No pudimos enviar el código.");
      }
    } catch (err) {
      console.error("Error requesting OTP:", err);
      setErrorMessage("Error de red al solicitar el código.");
    } finally {
      setIsLoadingCard(false);
    }
  };

  // 5. Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginDni.trim() || loginPhone.trim();
    if (!identifier || !otpCode.trim()) return;

    setIsVerifyingOtp(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/portal/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          code: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsOtpModalOpen(false);
        setOtpCode("");
        await loadCardByIdentifier(identifier, true);
      } else {
        setErrorMessage(data.error || "Código incorrecto o vencido.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setErrorMessage("Error al verificar código.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Direct fast login with DNI without OTP (local convenience)
  const handleDirectDniLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginDni.trim()) {
      loadCardByIdentifier(loginDni.trim(), true);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    setCardData(null);
    setLoginDni("");
    setLoginPhone("");
    setErrorMessage(null);
  };

  const handleShareCard = async () => {
    if (isSharingRef.current) return;
    isSharingRef.current = true;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tarjeta de Fidelización - ${restaurant?.name || "GastroBumeran"}`,
          text: `Mirá mis puntos acumulados en ${restaurant?.name || "GastroBumeran"}:`,
          url: shareUrl,
        });
      } catch {
        // Ignored if cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("¡Enlace copiado al portapapeles!");
    }
    setTimeout(() => {
      isSharingRef.current = false;
    }, 500);
  };

  if (loadingResto) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400">Cargando tarjeta del local...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500" />
        <h2 className="text-xl font-bold">Restaurante no encontrado</h2>
        <p className="text-sm text-gray-400 max-w-md">
          El enlace no corresponde a un comercio activo. Verificá la dirección ingresada o consultá en caja.
        </p>
        <Link href="/" className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-semibold text-white">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  const primaryColor = restaurant.primary_color || "#f59e0b";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Branded Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-9 h-9 rounded-xl object-contain bg-white/10 p-1 border border-white/10"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <span>{restaurant.stamp_icon || "🍔"}</span>
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">{restaurant.name}</h1>
              <span className="text-[10px] text-gray-400 block">{restaurant.card_slogan}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {deferredPrompt && (
              <button
                onClick={() => (deferredPrompt as any).prompt()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Instalar</span>
              </button>
            )}

            {cardData && (
              <>
                <button
                  onClick={handleShareCard}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
                  title="Compartir tarjeta"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
                  title="Salir"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {isLoadingCard ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <div
              className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${primaryColor} transparent transparent transparent` }}
            />
            <p className="text-xs text-gray-400 font-medium">Buscando tu saldo de puntos...</p>
          </div>
        ) : !cardData ? (
          /* Login / Verification Form */
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 animate-fade-in">
            <div className="text-center space-y-1.5">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg mb-2"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-2xl">{restaurant.stamp_icon || "🍔"}</span>
              </div>
              <h2 className="text-lg font-bold text-white">Ingresá a tu Tarjeta Digital</h2>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Consultá tus puntos disponibles, sellos y recompensas en <strong>{restaurant.name}</strong> sin descargar ninguna app.
              </p>
            </div>

            <form onSubmit={handleDirectDniLogin} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Número de DNI / Documento
                </label>
                <input
                  type="text"
                  required
                  value={loginDni}
                  onChange={(e) => setLoginDni(e.target.value)}
                  placeholder="Ej: 30123456"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl font-bold text-sm text-slate-950 shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    backgroundColor: primaryColor,
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ver Mi Saldo de Puntos</span>
                </button>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Verificar con Código OTP (WhatsApp)</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Active Card Display */
          <div className="space-y-6 animate-fade-in">
            {/* Branded Loyalty Card */}
            <LoyaltyCardVisual
              cardData={cardData}
              branding={restaurant}
              onOpenQr={() => setIsQrModalOpen(true)}
            />

            {/* Quick Action Button */}
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-slate-950 shadow-xl flex items-center justify-center gap-2 transition hover:opacity-95 active:scale-98 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              <QrCode className="w-5 h-5" />
              <span>Mostrar Código QR al Mozo / Caja</span>
            </button>

            {/* Active Promotions */}
            <ActiveCampaignsBanner campaigns={cardData.active_campaigns} />

            {/* Rewards Catalog */}
            <CustomerRewardsCatalog
              rewardsProgress={cardData.rewards_progress}
              onOpenQr={() => setIsQrModalOpen(true)}
            />

            {/* Activity History */}
            <CustomerHistoryList history={cardData.recent_history} />

            {/* Dynamic QR Modal */}
            <DynamicQrModal
              isOpen={isQrModalOpen}
              onClose={() => setIsQrModalOpen(false)}
              qrPayload={cardData.qr_payload}
              customerName={cardData.customer.name}
              documentNumber={cardData.customer.document_number}
              pointsBalance={cardData.customer.points_balance}
            />
          </div>
        )}
      </main>

      {/* OTP Verification Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Ingresá el código OTP</h3>
              <p className="text-xs text-gray-400">
                Enviamos un código temporal de 6 dígitos para validar tu identidad.
              </p>
            </div>

            {demoOtpCode && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-mono font-bold">
                Código demo: {demoOtpCode}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOtpModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-gray-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length < 4}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
                >
                  {isVerifyingOtp ? "Verificando..." : "Validar Código"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
