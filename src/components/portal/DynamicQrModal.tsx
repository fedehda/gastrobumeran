"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { X, QrCode, Sparkles, Copy, Check, Share2, Sun, Gift } from "lucide-react";
import { PortalRewardProgress } from "@/types/loyalty";

interface DynamicQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrPayload: string;
  customerName: string;
  documentNumber: string;
  pointsBalance: number;
  selectedReward?: PortalRewardProgress | null;
  onClearSelectedReward?: () => void;
}

export function DynamicQrModal({
  isOpen,
  onClose,
  qrPayload,
  customerName,
  documentNumber,
  pointsBalance,
  selectedReward,
  onClearSelectedReward,
}: DynamicQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const isSharingRef = useRef(false);

  useEffect(() => {
    const payloadToEncode = selectedReward
      ? `GASTRO:REDEEM:${selectedReward.reward.id}:DNI:${documentNumber}`
      : qrPayload;

    if (!payloadToEncode || !isOpen) return;

    QRCode.toDataURL(payloadToEncode, {
      width: 320,
      margin: 2,
      color: {
        dark: "#090d16",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR:", err));
  }, [qrPayload, selectedReward, documentNumber, isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(documentNumber);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleShare = async () => {
    if (isSharingRef.current) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      isSharingRef.current = true;
      try {
        const shareTitle = selectedReward
          ? `Canje GastroBumeran: ${selectedReward.reward.name}`
          : "Mi Tarjeta GastroBumeran";
        const shareText = selectedReward
          ? `¡Hola! Solicité canjear ${selectedReward.reward.name} en GastroBumeran (${customerName}).`
          : `¡Hola! Esta es mi tarjeta de fidelización en GastroBumeran (${customerName}). Puntos: ${pointsBalance}`;

        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        });
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      } catch (err: unknown) {
        const error = err as Error;
        if (
          error?.name === "AbortError" ||
          error?.name === "InvalidStateError" ||
          error?.name === "NotAllowedError"
        ) {
          return;
        }
        handleCopyCode();
      } finally {
        isSharingRef.current = false;
      }
    } else {
      handleCopyCode();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-sm rounded-3xl bg-white dark:bg-gradient-to-b dark:from-dark-900 dark:to-dark-950 border p-6 shadow-2xl text-center ${
          selectedReward
            ? "border-emerald-300 dark:border-emerald-500/50 shadow-emerald-500/10"
            : "border-slate-200 dark:border-amber-500/40 shadow-slate-900/10 dark:shadow-amber-500/10"
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-dark-800/80 dark:hover:bg-dark-700 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        {selectedReward ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-pulse">
                <Gift className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Canje de Producto Solicitado
              </span>
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5 px-4 leading-tight">
              {selectedReward.reward.name}
            </h3>

            {/* Reward cost pill */}
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold mb-3">
              <span>
                Costo:{" "}
                <strong className="text-emerald-900 dark:text-emerald-200">
                  {selectedReward.reward.reward_type === "POINTS" &&
                    `${selectedReward.reward.requirement_value} Pts`}
                  {selectedReward.reward.reward_type === "VISIT_MILESTONE" &&
                    `${selectedReward.reward.requirement_value} Visitas`}
                  {selectedReward.reward.reward_type === "BIRTHDAY_GIFT" && "Semana Natalicia"}
                </strong>
              </span>
              {selectedReward.reward.reward_type === "POINTS" && (
                <span>
                  Restante:{" "}
                  <strong>
                    {Math.max(0, pointsBalance - selectedReward.reward.requirement_value)} pts
                  </strong>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4 px-2">
              Mostrá este código al mozo o cajero para confirmar y entregar tu producto.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <QrCode className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Código QR Personal
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 truncate px-4">
              {customerName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-5">
              Presentá este código en el mostrador o mostráselo al mozo al momento de pagar.
            </p>
          </>
        )}

        {/* QR Code Container with High-Contrast White Background */}
        <div
          className={`relative mx-auto w-64 h-64 bg-white rounded-2xl p-3 shadow-inner flex items-center justify-center border-4 ${
            selectedReward ? "border-emerald-400/90" : "border-amber-400/80"
          }`}
        >
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={selectedReward ? "QR de Canje de Producto" : "QR de Fidelización"}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
              <Sparkles className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-xs">Generando código...</span>
            </div>
          )}
        </div>

        {/* DNI Number Badge */}
        <div className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-dark-800/80 border border-slate-200 dark:border-gray-700/60">
          <span className="text-xs text-slate-500 dark:text-gray-400">DNI / Nro. Fiscal:</span>
          <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-300">
            {documentNumber}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-1 text-slate-400 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-300 transition"
            title="Copiar DNI"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Toggle back to general QR button if in reward mode */}
        {selectedReward && onClearSelectedReward && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={onClearSelectedReward}
              className="text-xs font-semibold text-slate-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-300 underline transition inline-flex items-center gap-1"
            >
              <span>Cambiar a mi QR general de socio</span>
            </button>
          </div>
        )}

        {/* Brightness Tip */}
        <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300/80 bg-amber-500/10 rounded-lg py-1.5 px-3">
          <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
          <span>Sube el brillo de tu pantalla para facilitar el escaneo en caja</span>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-gray-200 text-xs font-medium border border-slate-200 dark:border-gray-700 transition"
          >
            {isShared ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span>Compartir</span>
          </button>
          <button
            onClick={onClose}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition shadow-lg ${
              selectedReward
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-emerald-500/20"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 shadow-amber-500/20"
            }`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
