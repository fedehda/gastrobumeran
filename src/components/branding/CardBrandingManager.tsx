"use client";

import React, { useState, useEffect } from "react";
import {
  Palette,
  Sparkles,
  Save,
  CheckCircle2,
  RefreshCw,
  Download,
  Store,
  QrCode,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Database,
  CloudUpload,
  Layers,
  MessageCircle,
  Globe,
  MapPin,
  Phone,
} from "lucide-react";
import { RestaurantBranding, CustomerPortalCard } from "@/types/loyalty";
import { LoyaltyCardVisual } from "@/components/portal/LoyaltyCardVisual";

const COLOR_PRESETS = [
  { name: "Ámbar Gourmet", hex: "#f59e0b", desc: "Clásico gastronómico cálido" },
  { name: "Rubí / Fuego", hex: "#ef4444", desc: "Parrillas, carnes y burgers" },
  { name: "Esmeralda Bar", hex: "#10b981", desc: "Cervecerías y coctelería" },
  { name: "Violeta Signature", hex: "#8b5cf6", desc: "Bistró y alta cocina" },
  { name: "Índigo Moderno", hex: "#6366f1", desc: "Cafés de especialidad" },
  { name: "Dorado Imperial", hex: "#eab308", desc: "Club VIP y lounge" },
  { name: "Rosa Sweet", hex: "#ec4899", desc: "Pastelerías y heladerías" },
  { name: "Cian Fresco", hex: "#06b6d4", desc: "Sushi y marisquería" },
];

const STAMP_PRESETS = [
  { icon: "🍔", label: "Burger" },
  { icon: "🍕", label: "Pizza" },
  { icon: "🍺", label: "Cerveza" },
  { icon: "☕", label: "Café" },
  { icon: "🥩", label: "Asado" },
  { icon: "🍸", label: "Cocktail" },
  { icon: "🍣", label: "Sushi" },
  { icon: "⭐", label: "Estrella" },
  { icon: "🎯", label: "Sellos" },
  { icon: "🔁", label: "Bumeran" },
];

export function CardBrandingManager() {
  const [branding, setBranding] = useState<RestaurantBranding>({
    id: "resto-local-default",
    slug: "mi-resto",
    name: "GastroBumeran Restó",
    legal_name: "GastroBumeran S.A.",
    cuit: "20-12345678-9",
    logo_url: "",
    primary_color: "#f59e0b",
    secondary_color: "#1e293b",
    accent_color: "#3b82f6",
    currency_symbol: "$",
    stamp_icon: "🍔",
    card_slogan: "Club de Fidelización Gastronómica",
    address: "Av. Corrientes 1234",
    city: "Buenos Aires",
    phone: "+54 11 4444-5555",
    whatsapp: "+5491144445555",
    instagram: "@gastrobumeran",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null);

  // Demo card data for live preview
  const previewCardData: CustomerPortalCard = {
    customer: {
      id: "demo-cust-preview",
      restaurant_id: branding.id,
      document_number: "30123456",
      name: "Juan Pérez",
      points_balance: 480,
      total_spent: 48000,
      visit_count: 4,
      last_visit_at: new Date().toISOString(),
      points_expire_at: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString(),
      loyalty_enrolled: 1,
      created_at: new Date().toISOString(),
    },
    tier: {
      name: "Plata",
      level: 2,
      badge_color: "bg-slate-500/20 text-slate-200 border-slate-400/40",
      gradient_class: "from-slate-900 via-slate-800 to-zinc-900 border-slate-400/40",
      next_tier_name: "Oro",
      visits_needed_for_next: 1,
      progress_percent: 66,
    },
    birthday_status: {
      isEligible: false,
      daysDiff: 40,
      message: "Cumpleaños en 40 días",
      alreadyClaimedThisYear: false,
    },
    days_until_inactivity_expiry: 85,
    is_expiring_soon: false,
    next_expiring_batch: {
      points: 250,
      expires_at: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString(),
      days_left: 270,
    },
    rewards_progress: [],
    recent_history: [],
    qr_payload: `GASTRO:${branding.slug}:DNI:30123456`,
    restaurant: branding,
  };

  useEffect(() => {
    fetch("/api/restaurant/branding")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.branding) {
          setBranding(data.branding);
          if (data.diagnostics) setDiagnostics(data.diagnostics);
        }
      })
      .catch((err) => console.error("Error fetching branding:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/restaurant/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: "¡Personalización guardada con éxito!", type: "success" });
        if (data.branding) setBranding(data.branding);
      } else {
        setStatusMessage({ text: data.error || "Error al guardar cambios.", type: "error" });
      }
    } catch (err) {
      console.error("Error saving branding:", err);
      setStatusMessage({ text: "Error de red al guardar los cambios.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCloudExport = () => {
    window.location.href = "/api/admin/migration/export";
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-bumeran-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-gray-400">Cargando personalización de tarjeta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-bumeran-500/10 border border-bumeran-500/20 text-bumeran-500 dark:text-bumeran-400">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Personalización de la Tarjeta del Cliente & Marca (Sprint O)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Local-Offline Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Modifica en vivo los colores, logo, sellos y textos que tus comensales verán en su tarjeta digital PWA y en su portal web.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/r/${branding.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-gray-200 text-xs font-semibold border border-slate-200 dark:border-dark-700 transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Ver Tarjeta en /r/{branding.slug}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Form Controls (Left) vs Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Section 1: Identidad y Textos */}
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-dark-800 pb-3">
              <Store className="w-4 h-4 text-bumeran-500" />
              <span>1. Identidad del Restaurante & Tarjeta</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Nombre Comercial del Local
                </label>
                <input
                  type="text"
                  required
                  value={branding.name}
                  onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                  placeholder="Ej: GastroBumeran Restó"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bumeran-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Slug URL Web (/r/[slug])
                </label>
                <input
                  type="text"
                  required
                  value={branding.slug}
                  onChange={(e) =>
                    setBranding({ ...branding, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-") })
                  }
                  placeholder="mi-resto"
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bumeran-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Lema o Subtítulo de la Tarjeta
              </label>
              <input
                type="text"
                value={branding.card_slogan}
                onChange={(e) => setBranding({ ...branding, card_slogan: e.target.value })}
                placeholder="Ej: Club de Fidelización Gastronómica"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bumeran-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                URL del Logotipo (Opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={branding.logo_url || ""}
                  onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                  placeholder="https://tu-dominio.com/logo.png"
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bumeran-500"
                />
                {branding.logo_url && (
                  <button
                    type="button"
                    onClick={() => setBranding({ ...branding, logo_url: "" })}
                    className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 text-slate-600 dark:text-gray-300"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                Si no cargas una URL, se mostrará el ícono distintivo con el color primario de tu marca.
              </p>
            </div>
          </div>

          {/* Section 2: Colores Corporativos */}
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-dark-800 pb-3">
              <Palette className="w-4 h-4 text-bumeran-500" />
              <span>2. Paleta de Colores de la Tarjeta</span>
            </h3>

            {/* Presets Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-2">
                Paletas Rápidas Recomendadas:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = branding.primary_color.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setBranding({ ...branding, primary_color: preset.hex })}
                      className={`p-2 rounded-xl border text-left transition flex items-center gap-2 ${
                        isSelected
                          ? "border-bumeran-500 bg-bumeran-500/10 shadow-sm"
                          : "border-slate-200 dark:border-dark-800 hover:bg-slate-50 dark:hover:bg-dark-800"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold truncate text-slate-900 dark:text-white">
                          {preset.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Color Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Color Primario (Acentos, Puntos, Bordes)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-mono uppercase bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Color de Acento / Secundario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.accent_color || "#3b82f6"}
                    onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={branding.accent_color || "#3b82f6"}
                    onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-mono uppercase bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Sellos de Visitas */}
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-dark-800 pb-3">
              <Sparkles className="w-4 h-4 text-bumeran-500" />
              <span>3. Ícono Personalizado de Sellos de Visita</span>
            </h3>

            <p className="text-xs text-slate-500 dark:text-gray-400">
              Elegí el símbolo temático que se estampará en los casilleros de frecuencia de la tarjeta con cada consumo computable:
            </p>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {STAMP_PRESETS.map((item) => {
                const isSelected = branding.stamp_icon === item.icon;
                return (
                  <button
                    key={item.icon}
                    type="button"
                    onClick={() => setBranding({ ...branding, stamp_icon: item.icon })}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center text-lg transition border ${
                      isSelected
                        ? "border-bumeran-500 bg-bumeran-500/20 scale-105 shadow-sm"
                        : "border-slate-200 dark:border-dark-800 hover:bg-slate-100 dark:hover:bg-dark-800 opacity-70 hover:opacity-100"
                    }`}
                    title={item.label}
                  >
                    <span>{item.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Contacto & Redes en la Tarjeta */}
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-dark-800 pb-3">
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              <span>4. Datos de Contacto Directo en la Tarjeta</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>WhatsApp del Restaurante</span>
                </label>
                <input
                  type="text"
                  value={branding.whatsapp || ""}
                  onChange={(e) => setBranding({ ...branding, whatsapp: e.target.value })}
                  placeholder="+5491144445555"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-pink-500" />
                  <span>Instagram Oficial</span>
                </label>
                <input
                  type="text"
                  value={branding.instagram || ""}
                  onChange={(e) => setBranding({ ...branding, instagram: e.target.value })}
                  placeholder="@tu_restaurante"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Teléfono Fijo / Reservas</span>
                </label>
                <input
                  type="text"
                  value={branding.phone || ""}
                  onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                  placeholder="+54 11 4444-5555"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dirección del Salón</span>
                </label>
                <input
                  type="text"
                  value={branding.address || ""}
                  onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                  placeholder="Av. Corrientes 1234, CABA"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-bumeran-600 hover:bg-bumeran-500 text-white font-bold text-xs shadow-glow transition active:scale-95 disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${isSaving ? "animate-spin" : ""}`} />
              <span>{isSaving ? "Guardando personalización..." : "Guardar Personalización de Marca"}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Live Interactive Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-xl sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-bumeran-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Vista Previa en Vivo (Live Preview)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tarjeta VIP Metal
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
              Así verán tus clientes su tarjeta en el celular cuando ingresen a tu local o abran la web app:
            </p>

            {/* Visual Card */}
            <div className="max-w-sm mx-auto">
              <LoyaltyCardVisual
                cardData={previewCardData}
                branding={branding}
                onOpenQr={() => alert(`Código QR de muestra: GASTRO:${branding.slug}:DNI:30123456`)}
              />
            </div>

            {/* Preview Links */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-dark-800 space-y-2">
              <div className="text-[11px] text-slate-500 dark:text-gray-400">
                <strong>Enlace directo al Portal del Cliente:</strong>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 text-xs font-mono text-slate-700 dark:text-gray-300">
                <span className="truncate flex-1">/r/{branding.slug}</span>
                <a
                  href={`/r/${branding.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-bumeran-500 hover:text-bumeran-400 font-bold shrink-0 text-[11px]"
                >
                  Abrir ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Preparación & Migración a Cloud-SaaS */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-dark-900 to-slate-950 border border-slate-800 text-white shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Compatibilidad & Preparación para Migración a Cloud-SaaS
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  SQLite Tenant-Aware
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                La base de datos local almacena todas las tablas etiquetadas con{" "}
                <code className="text-amber-300 font-mono">restaurant_id: &apos;{branding.id}&apos;</code>.
                Cuando decidas migrar a la nube multi-restaurante, todos tus clientes, ventas, lotes FIFO y configuraciones se importarán íntegramente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadCloudExport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-glow transition active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Backup Cloud-SaaS (JSON)</span>
          </button>
        </div>

        {/* Diagnostics Metrics */}
        {diagnostics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 text-[10px] block uppercase">Clientes Locales</span>
              <span className="text-base font-black text-white">
                {(diagnostics.counts as Record<string, number>)?.customers || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 text-[10px] block uppercase">Ventas Asentadas</span>
              <span className="text-base font-black text-white">
                {(diagnostics.counts as Record<string, number>)?.sales || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 text-[10px] block uppercase">Lotes FIFO Activos</span>
              <span className="text-base font-black text-white">
                {(diagnostics.counts as Record<string, number>)?.batches || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 text-[10px] block uppercase">Puntos en Circulación</span>
              <span className="text-base font-black text-amber-400">
                {(diagnostics.counts as Record<string, number>)?.total_active_points || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 text-[10px] block uppercase">Premios y Canjes</span>
              <span className="text-base font-black text-white">
                {(diagnostics.counts as Record<string, number>)?.rewards || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-gray-400 text-[10px] block uppercase">Compatibilidad Cloud</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>100% Lista</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
