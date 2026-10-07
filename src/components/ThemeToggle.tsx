"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={resolvedTheme === "dark" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
      aria-label="Alternar modo claro u oscuro"
      className={`p-2 rounded-xl transition-all border flex items-center space-x-1.5 shrink-0 ${
        resolvedTheme === "dark"
          ? "bg-dark-900 hover:bg-dark-800 text-amber-400 hover:text-amber-300 border-dark-800 shadow-sm"
          : "bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm"
      } ${className}`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">
          {resolvedTheme === "dark" ? "Modo Claro" : "Modo Oscuro"}
        </span>
      )}
    </button>
  );
}
