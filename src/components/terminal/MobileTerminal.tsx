"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  Store,
  LogOut,
  QrCode,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";
import { CustomerPortalCard, Customer, AdminUser } from "@/types/loyalty";
import { QrCameraScanner } from "./QrCameraScanner";
import { CustomerLoyaltyCard } from "./CustomerLoyaltyCard";
import { RewardsRedeemCatalog } from "./RewardsRedeemCatalog";

interface MobileTerminalProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    primary_color?: string;
  };
  currentUser?: AdminUser | null;
  onLogout: () => void;
}

interface LastRedemptionReceipt {
  customerName: string;
  customerDni: string;
  rewardName: string;
  pointsDeducted: number;
  remainingPoints: number;
  timestamp: string;
  message: string;
}

export function MobileTerminal({
  restaurant,
  currentUser,
  onLogout,
}: MobileTerminalProps) {
  // State machine: "SCAN" | "CUSTOMER" | "RECEIPT"
  const [activeStep, setActiveStep] = useState<"SCAN" | "CUSTOMER" | "RECEIPT">("SCAN");
  const [customerCard, setCustomerCard] = useState<CustomerPortalCard | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<LastRedemptionReceipt | null>(null);

  // Load customer card by scanned QR code payload or manual document string
  const handleScanSuccess = useCallback(
    async (rawCode: string) => {
      setIsLoadingCustomer(true);
      setErrorMessage(null);

      try {
        const res = await fetch(
          `/api/r/${restaurant.slug}/card?query=${encodeURIComponent(rawCode.trim())}`
        );
        const data = await res.json();

        if (data.success && data.card) {
          setCustomerCard(data.card);
          setActiveStep("CUSTOMER");
        } else {
          setErrorMessage(
            data.error ||
              "No se encontró ninguna tarjeta de fidelización asociada a este código en " +
                restaurant.name
          );
        }
      } catch (err) {
        console.error("Error al buscar cliente por QR:", err);
        setErrorMessage("Error de conexión al consultar la tarjeta. Verificá tu red wifi/móvil.");
      } finally {
        setIsLoadingCustomer(false);
      }
    },
    [restaurant.slug, restaurant.name]
  );

  // Handle redemption success
  const handleRedeemSuccess = (
    updatedCustomer: Customer,
    rewardName: string,
    pointsDeducted: number,
    transactionMessage: string
  ) => {
    // Generate receipt
    setLastReceipt({
      customerName: updatedCustomer.name,
      customerDni: updatedCustomer.document_number,
      rewardName,
      pointsDeducted,
      remainingPoints: updatedCustomer.points_balance,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      message: transactionMessage,
    });

    // Update customer card locally with new balance
    if (customerCard) {
      const updatedRewards = customerCard.rewards_progress.map((item) => {
        if (item.reward.reward_type === "POINTS") {
          const isRedeemable = updatedCustomer.points_balance >= item.reward.requirement_value;
          const progress = Math.min(
            100,
            Math.round(
              (updatedCustomer.points_balance / Math.max(1, item.reward.requirement_value)) * 100
            )
          );
          return {
            ...item,
            is_redeemable: isRedeemable,
            progress_percent: progress,
            points_needed: Math.max(0, item.reward.requirement_value - updatedCustomer.points_balance),
          };
        }
        return item;
      });

      setCustomerCard({
        ...customerCard,
        customer: updatedCustomer,
        rewards_progress: updatedRewards,
      });
    }

    setActiveStep("RECEIPT");
  };

  // Reset back to scanner
  const handleResetToScanner = () => {
    setCustomerCard(null);
    setErrorMessage(null);
    setActiveStep("SCAN");
  };

  // Continue with same customer
  const handleContinueWithCustomer = () => {
    setActiveStep("CUSTOMER");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Mobile Terminal Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Restaurant identity */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
              style={{ backgroundColor: restaurant.primary_color || "#f59e0b" }}
            >
              <Store className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-tight line-clamp-1">
                {restaurant.name}
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>Terminal Mozo / Caja</span>
                {currentUser?.name && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold">{currentUser.name}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            {/* Link to desktop admin if admin role */}
            {currentUser &&
              (currentUser.role === "ADMIN" || currentUser.role === "PLATFORM_ADMIN") && (
                <Link
                  href="/admin"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                  title="Panel Administrativo Completo"
                >
                  <LayoutDashboard className="w-4 h-4" />
                </Link>
              )}

            {/* Logout / Lock Terminal Button */}
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 transition"
              title="Cerrar turno / Bloquear terminal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col justify-start">
        {/* Error Notification Toast */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-[11px] text-rose-400 underline font-bold mt-1"
              >
                Cerrar aviso
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Live QR Camera Scanner */}
        {activeStep === "SCAN" && (
          <div className="space-y-4 my-auto">
            <div className="text-center mb-1">
              <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                <span>Escanear Tarjeta de Cliente</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Acercá la cámara al QR en el celular del cliente
              </p>
            </div>

            <QrCameraScanner
              onScanSuccess={handleScanSuccess}
              isProcessing={isLoadingCustomer}
              restaurantName={restaurant.name}
            />
          </div>
        )}

        {/* STEP 2: Customer Card Loaded & Product Redemption Catalog */}
        {activeStep === "CUSTOMER" && customerCard && (
          <div className="space-y-4 pb-6 animate-in fade-in duration-200">
            {/* Top Navigation Back to Scanner */}
            <button
              type="button"
              onClick={handleResetToScanner}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-400 transition py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Escáner</span>
            </button>

            {/* Customer Digital Card Display */}
            <CustomerLoyaltyCard
              card={customerCard}
              restaurantName={restaurant.name}
              onClearCustomer={handleResetToScanner}
            />

            {/* Rewards Redemption Catalog */}
            <RewardsRedeemCatalog
              customer={customerCard.customer}
              rewardsProgress={customerCard.rewards_progress}
              onRedeemSuccess={handleRedeemSuccess}
            />
          </div>
        )}

        {/* STEP 3: Official Digital Redemption Receipt */}
        {activeStep === "RECEIPT" && lastReceipt && (
          <div className="space-y-4 my-auto animate-in zoom-in-95 duration-200">
            <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 text-center space-y-4">
              {/* Checkmark icon with pulsing halo */}
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  ¡Canje Confirmado!
                </span>
                <h3 className="text-xl font-black text-white mt-2 leading-tight">
                  {lastReceipt.rewardName}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Entregá el producto al comensal en mesa o mostrador
                </p>
              </div>

              {/* Receipt Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="font-bold text-white">{lastReceipt.customerName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">DNI:</span>
                  <span className="font-mono text-slate-300">{lastReceipt.customerDni}</span>
                </div>
                {lastReceipt.pointsDeducted > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-850 text-rose-400 font-bold">
                    <span>Puntos debitados:</span>
                    <span>-{lastReceipt.pointsDeducted} pts</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Nuevo saldo disponible:</span>
                  <span className="font-black text-amber-400">{lastReceipt.remainingPoints} pts</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500 text-[11px]">
                  <span>Hora de entrega:</span>
                  <span>{lastReceipt.timestamp}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetToScanner}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Escanear Siguiente Cliente</span>
                </button>

                <button
                  type="button"
                  onClick={handleContinueWithCustomer}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Continuar con este cliente
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 py-3 border-t border-slate-900 px-4">
        GastroBumeran Cloud • Terminal Móvil v2.0
      </footer>
    </div>
  );
}
