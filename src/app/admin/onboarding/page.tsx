"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Store,
  Sliders,
  Gift,
  QrCode,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import QRCode from "qrcode";

interface RestaurantProfile {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color?: string;
  accent_color?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Step 1: Branding
  const [restoName, setRestoName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#f59e0b");
  const [logoUrl, setLogoUrl] = useState("");

  // Step 2: Loyalty Rules
  const [earningRate, setEarningRate] = useState(100);
  const [minSpendVisit, setMinSpendVisit] = useState(1500);
  const [expirationDays, setExpirationDays] = useState(90);
  const [allowCounterVisit, setAllowCounterVisit] = useState(false);

  // Step 3: Rewards catalog selection
  const [selectedRewards, setSelectedRewards] = useState<string[]>([
    "cafe",
    "postre",
    "trago",
    "hamburguesa",
    "hito_visita",
  ]);

  // Step 4: QR & Links
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Load session & restaurant info
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          const user = data.user;
          const resto: RestaurantProfile = {
            id: user.restaurant_id || "resto-demo-default",
            name: user.restaurant_name || "Mi Restaurante",
            slug: user.restaurant_slug || "demo",
            primary_color: "#f59e0b",
          };
          setRestaurant(resto);
          setRestoName(resto.name);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Generate QR Code when slug is ready
  useEffect(() => {
    if (!restaurant?.slug) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://gastrobumeran.com";
    const portalUrl = `${origin}/r/${restaurant.slug}`;

    QRCode.toDataURL(portalUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: primaryColor || "#000000",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR:", err));
  }, [restaurant?.slug, primaryColor]);

  const handleSaveStep1 = async () => {
    // Save updated restaurant settings if needed
    setStep(2);
  };

  const handleSaveStep2 = async () => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points_earning_rate: earningRate,
          min_spend_for_visit: minSpendVisit,
          points_expiration_days: expirationDays,
          allow_visit_counter: allowCounterVisit,
        }),
      });
    } catch (err) {
      console.warn("Could not save settings in onboarding:", err);
    }
    setStep(3);
  };

  const handleSaveStep3 = () => {
    setStep(4);
  };

  const copyPortalUrl = () => {
    if (!restaurant?.slug) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://gastrobumeran.com";
    const url = `${origin}/r/${restaurant.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handlePrintQr = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs">Cargando asistente de configuración...</p>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://gastrobumeran.com";
  const portalUrl = restaurant ? `${origin}/r/${restaurant.slug}` : "";
  const posUrl = restaurant ? `${origin}/r/${restaurant.slug}/caja` : "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header & Stepper */}
      <header className="max-w-3xl mx-auto w-full pb-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-bumeran-600 to-amber-500 flex items-center justify-center font-bold text-white text-base shadow-glow">
              G
            </div>
            <span className="font-bold text-base text-white tracking-tight">GastroBumeran</span>
          </Link>
          <Link
            href="/admin"
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Saltar al panel →
          </Link>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { num: 1, label: "Identidad", icon: Store },
            { num: 2, label: "Reglas", icon: Sliders },
            { num: 3, label: "Premios", icon: Gift },
            { num: 4, label: "Lanzamiento", icon: QrCode },
          ].map((s) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            const Icon = s.icon;
            return (
              <div key={s.num} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isDone || isCurrent ? "bg-amber-500 shadow-glow" : "bg-slate-800"
                  }`}
                />
                <div className="flex items-center justify-center space-x-1">
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isCurrent
                        ? "text-amber-400 font-bold"
                        : isDone
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }`}
                  />
                  <span
                    className={`text-[11px] font-semibold hidden sm:inline ${
                      isCurrent
                        ? "text-white"
                        : isDone
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Step Content */}
      <main className="max-w-2xl mx-auto w-full my-auto">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
          {/* STEP 1: BRANDING */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Paso 1 de 4
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Personalizá la Identidad de tu Local
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Tus comensales verán tu logo y colores distintivos en su tarjeta digital.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nombre Fantasía del Restaurante
                  </label>
                  <input
                    type="text"
                    value={restoName}
                    onChange={(e) => setRestoName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Color Principal de Marca
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-800"
                    />
                    <div className="flex flex-wrap gap-2">
                      {["#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPrimaryColor(c)}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${
                            primaryColor === c ? "border-white scale-110 shadow-lg" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    URL del Logo (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              {/* Preview Banner */}
              <div
                className="p-4 rounded-2xl text-white flex items-center space-x-3 shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
                  {restoName.slice(0, 1) || "R"}
                </div>
                <div>
                  <div className="font-bold text-sm">{restoName || "Nombre del Local"}</div>
                  <div className="text-[11px] opacity-80">Tarjeta Virtual del Comensal</div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveStep1}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-500 hover:from-bumeran-500 hover:to-amber-400 text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-2"
                >
                  <span>Continuar a Reglas</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: LOYALTY RULES */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Paso 2 de 4
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Reglas de Puntos y Frecuencia
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Valores probados en gastronomía para maximizar el retorno de inversión.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white">
                      Tasa de Conversión: Cada $ cuánto se otorga 1 Punto
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ${earningRate} = 1 pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="50"
                    value={earningRate}
                    onChange={(e) => setEarningRate(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Ejemplo: Un comensal que gasta $10.000 acumula {Math.floor(10000 / earningRate)} puntos.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white">
                      Consumo Mínimo para Computar +1 Visita
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ${minSpendVisit.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="500"
                    value={minSpendVisit}
                    onChange={(e) => setMinSpendVisit(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Premia la recurrencia evitando tickets testimoniales de sólo café o chicle.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white">
                      Vencimiento por Inactividad (Timer 1)
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {expirationDays} días
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="15"
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    El plazo se renueva con cada visita del cliente al local.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveStep2}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-500 hover:from-bumeran-500 hover:to-amber-400 text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-2"
                >
                  <span>Continuar a Premios</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PRE-CONFIGURED REWARDS */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Paso 3 de 4
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Catálogo Inicial de Recompensas
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Seleccioná los premios gastronómicos con los que querés comenzar (podés editarlos luego).
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: "cafe", name: "Café de Especialidad + Medialuna", pts: 150, type: "Puntos" },
                  { id: "postre", name: "Postre de la Casa (Flan o Tiramisú)", pts: 300, type: "Puntos" },
                  { id: "trago", name: "Trago de Autor / Coctelería Signature", pts: 450, type: "Puntos" },
                  { id: "hamburguesa", name: "Hamburguesa Gourmet con Papas", pts: 800, type: "Puntos" },
                  { id: "hito_visita", name: "20% OFF en tu 5ta Visita al Local", pts: 5, type: "Visitas" },
                ].map((r) => {
                  const isChecked = selectedRewards.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? "bg-amber-500/10 border-amber-500/40 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRewards((prev) => [...prev, r.id]);
                            } else {
                              setSelectedRewards((prev) => prev.filter((x) => x !== r.id));
                            }
                          }}
                          className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold">{r.name}</div>
                          <div className="text-[11px] text-slate-500">Tipo: {r.type}</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {r.pts} {r.type === "Puntos" ? "pts" : "visitas"}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveStep3}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-500 hover:from-bumeran-500 hover:to-amber-400 text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-2"
                >
                  <span>Ver Kit de Lanzamiento</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: LAUNCH KIT & QR */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200 text-center sm:text-left">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  ¡Listo para Lanzar!
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Tu Kit de Puntos y QR de Mesa
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Imprimí el QR para colocar en las mesas o mostrador, y abrí la caja de cobro.
                </p>
              </div>

              {/* QR Preview Block */}
              <div className="p-6 rounded-3xl bg-white text-slate-900 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 print:m-0">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Programa de Fidelización
                  </div>
                  <h2 className="text-xl font-black text-slate-900">{restoName || "Restaurante"}</h2>
                  <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                    Escaneá el código QR con tu celular para consultar tus puntos, visitas y canjear premios.
                  </p>
                  <div className="font-mono text-[10px] text-slate-400 break-all pt-2">
                    {portalUrl}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 shadow-inner">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR del Restaurante" className="w-36 h-36" />
                  ) : (
                    <div className="w-36 h-36 bg-slate-200 animate-pulse rounded-xl" />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={copyPortalUrl}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center space-x-2"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "¡Enlace Copiado!" : "Copiar Enlace del Cliente"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintQr}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir QR para Mesas</span>
                </button>
              </div>

              {/* Direct links summary */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="text-slate-400 text-[11px] font-semibold uppercase">Accesos Rápidos:</div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Tarjeta de Cliente: /r/{restaurant?.slug}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={posUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Terminal de Caja: /r/{restaurant?.slug}/caja</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Final Launch Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-bumeran-600 to-amber-500 hover:from-bumeran-500 hover:to-amber-400 text-white font-black text-sm shadow-glow transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>¡Finalizar y Comenzar a Fidelizar en Caja!</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto w-full pt-8 text-center text-xs text-slate-500">
        GastroBumeran Cloud • Configuración Inicial Asistida
      </footer>
    </div>
  );
}
