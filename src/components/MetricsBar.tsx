"use client";

import React from "react";
import { DollarSign, Award, Gift, Users } from "lucide-react";

interface MetricsBarProps {
  metrics: {
    total_customers: number;
    total_points: number;
    total_revenue: number;
    today_sales_count: number;
    today_sales_amount: number;
    today_points_issued: number;
    today_redemptions_count: number;
  };
}

export function MetricsBar({ metrics }: MetricsBarProps) {
  const cards = [
    {
      title: "Ventas Hoy",
      value: `$${(metrics.today_sales_amount || 0).toLocaleString("es-AR")}`,
      subtitle: `${metrics.today_sales_count || 0} tickets emitidos`,
      icon: DollarSign,
      color: "from-emerald-500/20 to-emerald-600/5",
      border: "border-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      title: "Puntos Emitidos Hoy",
      value: `+${(metrics.today_points_issued || 0).toLocaleString("es-AR")}`,
      subtitle: "Acumulación comensales",
      icon: Award,
      color: "from-bumeran-500/20 to-bumeran-600/5",
      border: "border-bumeran-500/20",
      iconColor: "text-bumeran-400",
    },
    {
      title: "Canjes Hoy",
      value: (metrics.today_redemptions_count || 0).toString(),
      subtitle: "Premios entregados en caja",
      icon: Gift,
      color: "from-amber-500/20 to-amber-600/5",
      border: "border-amber-500/20",
      iconColor: "text-amber-400",
    },
    {
      title: "Comensales Fidelizados",
      value: (metrics.total_customers || 0).toString(),
      subtitle: "Base de datos activa",
      icon: Users,
      color: "from-blue-500/20 to-blue-600/5",
      border: "border-blue-500/20",
      iconColor: "text-blue-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${c.color} bg-dark-900/60 border ${c.border} p-3.5 sm:p-4 backdrop-blur-sm transition-all duration-200 hover:border-opacity-40`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400">{c.title}</span>
              <div className={`p-1.5 rounded-lg bg-dark-950/60 ${c.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-0.5">{c.value}</div>
            <div className="text-[11px] text-gray-500">{c.subtitle}</div>
          </div>
        );
      })}
    </div>
  );
}
