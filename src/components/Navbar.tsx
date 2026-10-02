"use client";

import React from "react";
import { Utensils, RefreshCw, Sliders, Flame, FileSpreadsheet, Zap, BarChart3, LogOut, QrCode, Ban } from "lucide-react";
import { AdminUser } from "@/types/loyalty";

interface NavbarProps {
  user?: AdminUser | null;
  onLogout?: () => void;
  viewMode?: "pos" | "analytics";
  onViewModeChange?: (mode: "pos" | "analytics") => void;
  onOpenSettings: () => void;
  onOpenAudit: () => void;
  onOpenCsvWizard: () => void;
  onOpenFudo: () => void;
  onOpenVoidSale?: () => void;
  onRefreshMetrics: () => void;
  isRefreshing?: boolean;
}

export function Navbar({
  user,
  onLogout,
  viewMode = "pos",
  onViewModeChange,
  onOpenSettings,
  onOpenAudit,
  onOpenCsvWizard,
  onOpenFudo,
  onOpenVoidSale,
  onRefreshMetrics,
  isRefreshing,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-dark-800 bg-dark-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Mode Switcher */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-bumeran-600 to-amber-500 flex items-center justify-center shadow-glow">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Gastro<span className="text-bumeran-500">Bumeran</span>
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-bumeran-500/10 text-bumeran-400 border border-bumeran-500/20">
                  {viewMode === "pos" ? "POS & Ingesta" : "Backoffice"}
                </span>
              </div>
              <p className="text-xs text-dark-600 font-medium">Plataforma de Fidelización Gastronómica</p>
            </div>
          </div>

          {/* Mode Switcher Pills */}
          <div className="hidden md:flex items-center rounded-xl bg-dark-900 p-1 border border-dark-800">
            <button
              onClick={() => onViewModeChange?.("pos")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "pos"
                  ? "bg-bumeran-600 text-white shadow-glow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Caja POS</span>
            </button>
            <button
              onClick={() => onViewModeChange?.("analytics")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "analytics"
                  ? "bg-bumeran-600 text-white shadow-glow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Métricas & Backoffice</span>
            </button>
          </div>
        </div>

        {/* Status Indicator & Actions */}
        <div className="flex items-center space-x-2.5">
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-gray-300">Caja Online</span>
          </div>

          {/* Refresh & Fudo Sync Button */}
          <button
            onClick={onRefreshMetrics}
            disabled={isRefreshing}
            title="Sincronizar con Fudo POS y actualizar métricas"
            className="p-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
          </button>

          {/* Fudo API Sync Button */}
          <button
            onClick={onOpenFudo}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 border border-sky-500/30 text-sky-400 hover:text-sky-300 text-xs font-bold transition-all shadow-glow"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">API Fudo</span>
          </button>

          {/* Customer Portal Link */}
          <a
            href="/portal"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir Portal Web del Cliente (PWA & QR)"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 border border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all shadow-glow"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tarjeta Cliente</span>
          </a>

          {/* CSV Universal Importer Button */}
          <button
            onClick={onOpenCsvWizard}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all shadow-glow"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar CSV</span>
          </button>

          {/* Void Sale / Anular Venta Button */}
          {onOpenVoidSale && (
            <button
              onClick={onOpenVoidSale}
              title="Buscar tickets y anular ventas manualmente"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold transition-all shadow-glow"
            >
              <Ban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Anular Venta</span>
            </button>
          )}

          {/* 90-Day Audit Button */}
          <button
            onClick={onOpenAudit}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 border border-amber-500/20 text-amber-400 hover:text-amber-300 text-xs font-medium transition-colors"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Caducidad 90d & Alertas</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 border border-dark-800 text-gray-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reglas & Parámetros</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-dark-800">
              <div className="hidden xl:block text-right">
                <div className="text-xs font-bold text-white leading-tight">{user.name}</div>
                <div className="text-[10px] text-bumeran-400 font-semibold">{user.role}</div>
              </div>
              <button
                onClick={onLogout}
                title="Cerrar Sesión de Administrador"
                className="p-2 rounded-lg bg-dark-900 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-dark-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
