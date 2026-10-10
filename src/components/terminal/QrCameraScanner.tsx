"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Search,
  Upload,
  Sparkles,
  X,
  Keyboard,
} from "lucide-react";

interface QrCameraScannerProps {
  onScanSuccess: (scannedText: string) => void;
  isProcessing?: boolean;
  restaurantName?: string;
}

export function QrCameraScanner({
  onScanSuccess,
  isProcessing = false,
  restaurantName,
}: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isScanningActive = useRef<boolean>(true);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [manualInputOpen, setManualInputOpen] = useState<boolean>(false);
  const [manualQuery, setManualQuery] = useState<string>("");

  // Play a pleasant high-pitch audio chime on successful scan using Web Audio API
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6 chirp
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio might be blocked by autoplay policies on some devices, ignore silently
    }
  }, []);

  // Trigger haptic vibration if supported
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {
        // Ignore vibration errors
      }
    }
  }, []);

  // Stop camera stream safely
  const stopStream = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Handle successful scan payload
  const handleDetectedCode = useCallback(
    (codeText: string) => {
      if (!isScanningActive.current || isProcessing) return;
      isScanningActive.current = false;

      playBeep();
      triggerHaptic();

      onScanSuccess(codeText);

      // Re-arm after delay in case user remains on scanning screen
      setTimeout(() => {
        isScanningActive.current = true;
      }, 2500);
    },
    [isProcessing, onScanSuccess, playBeep, triggerHaptic]
  );

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setHasCameraPermission(false);
      setCameraError("Tu navegador no soporta acceso a la cámara o requiere HTTPS.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Required for iOS Safari inline video playback
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      setHasCameraPermission(true);

      // Check if torch/flashlight is supported on the active video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as { torch?: boolean }) : {};
        setHasTorch(Boolean(capabilities?.torch));
      }

      isScanningActive.current = true;
    } catch (err: unknown) {
      console.warn("Camera init error:", err);
      setHasCameraPermission(false);
      const errorMsg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Habilitalo en los ajustes de tu navegador."
          : "No se pudo acceder a la cámara. Verificá que no esté en uso por otra app.";
      setCameraError(errorMsg);
    }
  }, [facingMode, stopStream]);

  // Frame processing loop using Native BarcodeDetector with jsQR fallback
  useEffect(() => {
    let isActive = true;

    // Check if browser has native BarcodeDetector
    const hasNativeBarcodeDetector =
      typeof window !== "undefined" &&
      "BarcodeDetector" in window &&
      typeof (window as unknown as { BarcodeDetector: new (opts?: { formats: string[] }) => { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector === "function";

    let nativeDetector: { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } | null = null;
    if (hasNativeBarcodeDetector) {
      try {
        const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: new (opts?: { formats: string[] }) => { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
        nativeDetector = new BarcodeDetectorClass({ formats: ["qr_code"] });
      } catch {
        nativeDetector = null;
      }
    }

    const scanFrame = async () => {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        isScanningActive.current &&
        !isProcessing &&
        video &&
        video.readyState === video.HAVE_ENOUGH_DATA
      ) {
        // Strategy A: Native BarcodeDetector (Fastest, zero CPU overhead on modern mobile devices)
        if (nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleDetectedCode(barcodes[0].rawValue);
            }
          } catch {
            // Fall through to jsQR fallback
          }
        }

        // Strategy B: Canvas + jsQR fallback (100% cross-browser reliability)
        if (isScanningActive.current && canvas) {
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 480;

          // Downsample high-res video frames for fast 60fps mobile QR processing
          const scale = Math.min(1, 640 / Math.max(width, height));
          const targetW = Math.floor(width * scale);
          const targetH = Math.floor(height * scale);

          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, targetW, targetH);
            const imageData = ctx.getImageData(0, 0, targetW, targetH);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (qrCode && qrCode.data) {
              handleDetectedCode(qrCode.data);
            }
          }
        }
      }

      if (isActive) {
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    };

    if (hasCameraPermission) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    }

    return () => {
      isActive = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [hasCameraPermission, isProcessing, handleDetectedCode]);

  // Mount & start camera
  useEffect(() => {
    let isCancelled = false;

    const init = async () => {
      await Promise.resolve();
      if (!isCancelled) {
        await startCamera();
      }
    };

    init();

    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [startCamera, stopStream]);

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn("Error toggling flashlight:", err);
      }
    }
  };

  // Flip Camera (Front vs Rear)
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Handle Photo Upload with QR Code (Fallback when live camera is inaccessible)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDetectedCode(code.data);
          } else {
            alert("No se detectó ningún código QR legible en la imagen seleccionada.");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Clear input value so same file can be selected again
    e.target.value = "";
  };

  // Handle Manual Document Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    handleDetectedCode(manualQuery.trim());
    setManualQuery("");
    setManualInputOpen(false);
  };

  return (
    <div className="relative w-full max-w-md mx-auto flex flex-col items-center select-none">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Main Viewfinder Box */}
      <div className="relative w-full aspect-[4/5] sm:aspect-square bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
        {/* Real-time Video Stream */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            hasCameraPermission ? "opacity-100" : "opacity-0"
          }`}
          muted
          playsInline
          autoPlay
        />

        {/* Viewfinder Overlay with Cyberpunk-Clean Aesthetics */}
        {hasCameraPermission && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            {/* Darkened Vignette */}
            <div className="absolute inset-0 bg-black/35 backdrop-brightness-95" />

            {/* Target Reticle Frame */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl border border-amber-400/40 shadow-[0_0_25px_rgba(251,191,36,0.25)] flex items-center justify-center overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-scan" />

              {/* Subdued Center Target Icon */}
              <div className="w-12 h-12 rounded-xl border border-amber-400/20 flex items-center justify-center text-amber-400/40">
                <Camera className="w-6 h-6" />
              </div>
            </div>

            {/* Instruction Badge */}
            <div className="absolute bottom-5 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-xs font-medium text-slate-200 shadow-lg flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Apuntá al código QR del cliente</span>
            </div>
          </div>
        )}

        {/* Processing State Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 space-y-3">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shadow-lg" />
            <div className="text-center px-4">
              <p className="text-sm font-bold text-white">Leyendo Tarjeta...</p>
              <p className="text-xs text-slate-400 mt-0.5">Consultando saldo y beneficios del cliente</p>
            </div>
          </div>
        )}

        {/* Camera Permission / Error Fallback Screen */}
        {!hasCameraPermission && (
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-900 z-10 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-lg">
              <CameraOff className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cámara no disponible</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                {cameraError || "Permití el acceso a la cámara en tu celular para escanear en tiempo real."}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
              <button
                type="button"
                onClick={startCamera}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar Acceso a Cámara</span>
              </button>

              <button
                type="button"
                onClick={() => setManualInputOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <Keyboard className="w-4 h-4 text-amber-400" />
                <span>Ingresar DNI / Teléfono Manual</span>
              </button>
            </div>
          </div>
        )}

        {/* Viewfinder Floating Quick Action Controls (Top Bar) */}
        {hasCameraPermission && (
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
            {/* Flashlight / Torch toggle button */}
            {hasTorch ? (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`p-3 rounded-2xl backdrop-blur-md border transition active:scale-90 ${
                  isTorchOn
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                    : "bg-slate-900/70 text-slate-200 border-slate-700/80 hover:bg-slate-800/80"
                }`}
                aria-label="Encender linterna"
              >
                {isTorchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
              </button>
            ) : (
              <div className="w-10" />
            )}

            {/* Restaurant Identifier Tag */}
            {restaurantName && (
              <div className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-semibold text-slate-300">
                {restaurantName}
              </div>
            )}

            {/* Switch Camera Facing Mode */}
            <button
              type="button"
              onClick={handleFlipCamera}
              className="p-3 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 text-slate-200 hover:bg-slate-800/80 active:scale-90 transition"
              aria-label="Cambiar cámara"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Auxiliary Action Bar */}
      <div className="w-full grid grid-cols-2 gap-3 mt-4">
        {/* Manual Keyboard Search Toggle */}
        <button
          type="button"
          onClick={() => setManualInputOpen(true)}
          className="py-3 px-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
        >
          <Search className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Ingreso por DNI</span>
        </button>

        {/* Gallery Image Upload Fallback */}
        <label className="py-3 px-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition active:scale-95">
          <Upload className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Subir Foto QR</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Manual DNI / Phone Input Modal Sheet */}
      {manualInputOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Identificar Cliente</h4>
              </div>
              <button
                type="button"
                onClick={() => setManualInputOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Ingresá el número de documento (DNI/CUIL personal) o teléfono del comensal para cargar su tarjeta de beneficios:
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Ej: 35123456 ó 1198765432"
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-white placeholder-slate-500 text-base font-mono outline-none transition"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setManualInputOpen(false)}
                  className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!manualQuery.trim()}
                  className="w-2/3 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar Tarjeta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
