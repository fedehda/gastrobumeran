"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { X, QrCode, Sparkles, Copy, Check, Share2, Sun } from "lucide-react";

interface DynamicQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrPayload: string;
  customerName: string;
  documentNumber: string;
  pointsBalance: number;
}

export function DynamicQrModal({
  isOpen,
  onClose,
  qrPayload,
  customerName,
  documentNumber,
  pointsBalance,
}: DynamicQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const isSharingRef = useRef(false);

  useEffect(() => {
    if (!qrPayload || !isOpen) return;

    QRCode.toDataURL(qrPayload, {
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
  }, [qrPayload, isOpen]);

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
        await navigator.share({
          title: "Mi Tarjeta GastroBumeran",
          text: `¡Hola! Esta es mi tarjeta de fidelización en GastroBumeran (${customerName}). Puntos: ${pointsBalance}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-dark-900 to-dark-950 border border-amber-500/40 p-6 shadow-2xl shadow-amber-500/10 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-dark-800/80 hover:bg-dark-700 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Código QR Personal
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-1 truncate px-4">
          {customerName}
        </h3>
        <p className="text-xs text-gray-400 mb-5">
          Presentá este código en el mostrador o mostráselo al mozo al momento de pagar.
        </p>

        {/* QR Code Container with High-Contrast White Background */}
        <div className="relative mx-auto w-64 h-64 bg-white rounded-2xl p-3 shadow-inner flex items-center justify-center border-4 border-amber-400/80">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR de Fidelización"
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
        <div className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-dark-800/80 border border-gray-700/60">
          <span className="text-xs text-gray-400">DNI / Nro. Fiscal:</span>
          <span className="text-sm font-mono font-bold text-amber-300">
            {documentNumber}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-1 text-gray-400 hover:text-amber-300 transition"
            title="Copiar DNI"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Brightness Tip */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-amber-300/80 bg-amber-500/10 rounded-lg py-1.5 px-3">
          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Sube el brillo de tu pantalla para facilitar el escaneo en caja</span>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-200 text-xs font-medium border border-gray-700 transition"
          >
            {isShared ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Compartir</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 text-xs font-bold transition shadow-lg shadow-amber-500/20"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
