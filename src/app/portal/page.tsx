"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Share2,
  LogOut,
  QrCode,
  ChevronLeft,
  Check,
  Download,
} from "lucide-react";
import { CustomerPortalCard, PortalRewardProgress } from "@/types/loyalty";
import { LoyaltyCardVisual } from "@/components/portal/LoyaltyCardVisual";
import { DynamicQrModal } from "@/components/portal/DynamicQrModal";
import { CustomerRewardsCatalog } from "@/components/portal/CustomerRewardsCatalog";
import { CustomerHistoryList } from "@/components/portal/CustomerHistoryList";
import { PortalLoginPrompt } from "@/components/portal/PortalLoginPrompt";
import { ActiveCampaignsBanner } from "@/components/portal/ActiveCampaignsBanner";
import { ThemeToggle } from "@/components/ThemeToggle";

function PortalContent() {
  const searchParams = useSearchParams();
  const urlDni = searchParams.get("dni") || searchParams.get("id") || "";

  const [cardData, setCardData] = useState<CustomerPortalCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedRewardForQr, setSelectedRewardForQr] = useState<PortalRewardProgress | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const isSharingRef = useRef(false);

  // Catch beforeinstallprompt for PWA install button
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const loadCard = useCallback(async (identifier: string, remember = true) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/portal/card?dni=${encodeURIComponent(identifier)}`);
      const data = await res.json();
      if (data.success && data.card) {
        setCardData(data.card);
        if (remember) {
          localStorage.setItem("gastrobumeran_customer_dni", data.card.customer.document_number);
        }
      } else {
        setErrorMessage(data.error || "No se encontró la tarjeta.");
        setCardData(null);
      }
    } catch (err) {
      console.error("Error loading customer card:", err);
      setErrorMessage("Error de conexión al cargar la tarjeta.");
      setCardData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let isCancelled = false;
    const targetDni = urlDni.trim() || (typeof window !== "undefined" ? localStorage.getItem("gastrobumeran_customer_dni") || "" : "");
    if (!targetDni) {
      // Defer setting loading false to avoid synchronous render waterfall
      Promise.resolve().then(() => {
        if (!isCancelled) setIsLoading(false);
      });
      return;
    }

    fetch(`/api/portal/card?dni=${encodeURIComponent(targetDni)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (data.success && data.card) {
          setCardData(data.card);
          localStorage.setItem("gastrobumeran_customer_dni", data.card.customer.document_number);
        } else {
          setErrorMessage(data.error || "No se encontró la tarjeta.");
          setCardData(null);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error("Error loading customer card:", err);
        setErrorMessage("Error de conexión al cargar la tarjeta.");
        setCardData(null);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [urlDni]);

  const handleLogout = () => {
    localStorage.removeItem("gastrobumeran_customer_dni");
    setCardData(null);
    setErrorMessage(null);
    // Remove query params from URL without full reload
    window.history.replaceState(null, "", "/portal");
  };

  const handleShareCard = async () => {
    if (!cardData || isSharingRef.current) return;
    const shareUrl = `${window.location.origin}/portal?dni=${cardData.customer.document_number}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      isSharingRef.current = true;
      try {
        await navigator.share({
          title: "Mi Tarjeta GastroBumeran",
          text: `¡Mirá mis puntos y beneficios en GastroBumeran!`,
          url: shareUrl,
        });
      } catch (err: unknown) {
        const error = err as Error;
        // Ignorar cancelaciones del usuario o si ya había un share en progreso
        if (
          error?.name === "AbortError" ||
          error?.name === "InvalidStateError" ||
          error?.name === "NotAllowedError"
        ) {
          return;
        }
        // Fallback al portapapeles si la API nativa de compartir falló de forma imprevista
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        } catch {
          // Ignorar fallo de portapapeles
        }
      } finally {
        isSharingRef.current = false;
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (e) {
        console.error("Clipboard copy failed:", e);
      }
    }
  };

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deferredPrompt as any).prompt();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070a11] text-slate-800 dark:text-gray-100 flex flex-col justify-between selection:bg-amber-500 selection:text-white dark:selection:text-dark-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-gray-800/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-dark-950 font-black shadow-md shadow-amber-500/20">
              <span>🔁</span>
            </div>
            <div>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                GastroBumeran
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold ml-1.5 uppercase">
                Mi Tarjeta
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {deferredPrompt && (
              <button
                onClick={handleInstallPwa}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 text-xs font-semibold transition"
                title="Instalar como app en tu teléfono"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}

            {cardData ? (
              <>
                <button
                  onClick={handleShareCard}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-900 dark:hover:bg-dark-800 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-gray-800 transition"
                  title="Compartir enlace de tarjeta"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Share2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-dark-900 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300 border border-slate-200 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-500/40 transition"
                  title="Cambiar de tarjeta / Salir"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                href="/"
                className="text-xs text-slate-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-300 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Acceso Admin</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 dark:text-amber-400 animate-spin">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-gray-300">
              Cargando tu tarjeta de beneficios...
            </p>
          </div>
        ) : !cardData ? (
          <PortalLoginPrompt
            onSearchCard={(dni, remember) => loadCard(dni, remember)}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        ) : (
          <>
            {/* Loyalty Membership Card */}
            <LoyaltyCardVisual
              cardData={cardData}
              onOpenQr={() => {
                setSelectedRewardForQr(null);
                setIsQrModalOpen(true);
              }}
            />

            {/* Quick Action Button to Show QR Code */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedRewardForQr(null);
                  setIsQrModalOpen(true);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-dark-950 font-extrabold text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <QrCode className="w-5 h-5 text-dark-950" />
                <span>Mostrar Código QR al Mozo / Caja</span>
              </button>
            </div>

            {/* Active Dynamic Campaigns Banner */}
            <ActiveCampaignsBanner campaigns={cardData.active_campaigns} />

            {/* Rewards Catalog */}
            <CustomerRewardsCatalog
              rewardsProgress={cardData.rewards_progress}
              onOpenQr={(reward) => {
                setSelectedRewardForQr(reward || null);
                setIsQrModalOpen(true);
              }}
            />

            {/* Recent History / Activity */}
            <CustomerHistoryList history={cardData.recent_history} />

            {/* Dynamic QR Modal */}
            <DynamicQrModal
              isOpen={isQrModalOpen}
              onClose={() => {
                setIsQrModalOpen(false);
                setSelectedRewardForQr(null);
              }}
              qrPayload={cardData.qr_payload}
              customerName={cardData.customer.name}
              documentNumber={cardData.customer.document_number}
              pointsBalance={cardData.customer.points_balance}
              selectedReward={selectedRewardForQr}
              onClearSelectedReward={() => setSelectedRewardForQr(null)}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-gray-800/80 bg-white/60 dark:bg-dark-950/60 py-6 px-4 text-center text-xs text-slate-500 dark:text-gray-500 space-y-1">
        <p className="font-medium text-slate-600 dark:text-gray-400">
          GastroBumeran • Tarjeta Digital de Fidelización
        </p>
        <p className="text-[11px] text-slate-400 dark:text-gray-600">
          Tus puntos se mantienen vigentes por 90 días con cada visita.
        </p>
      </footer>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-[#070a11] flex items-center justify-center text-amber-500 dark:text-amber-400">
          <Sparkles className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
