"use client";

import React, { useState } from "react";
import { History, TrendingUp, Gift, Cake, Clock } from "lucide-react";
import { PointsHistory } from "@/types/loyalty";

interface CustomerHistoryListProps {
  history: PointsHistory[];
}

export function CustomerHistoryList({ history }: CustomerHistoryListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!history || history.length === 0) {
    return (
      <div className="rounded-2xl bg-dark-900/60 border border-gray-800 p-6 text-center">
        <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-xs text-gray-400">
          Aún no registras movimientos de puntos. ¡Tus próximas visitas aparecerán aquí!
        </p>
      </div>
    );
  }

  const displayedHistory = isExpanded ? history : history.slice(0, 5);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <span>Actividad Reciente</span>
        </h3>
        <span className="text-[11px] text-gray-400">
          Últimos movimientos registrados
        </span>
      </div>

      <div className="rounded-2xl bg-dark-900/80 border border-gray-800 divide-y divide-gray-800/80 overflow-hidden">
        {displayedHistory.map((item) => {
          const isPositive = item.points > 0;
          const isZero = item.points === 0;
          const isBirthday = item.concept.toLowerCase().includes("cumpleaños");

          return (
            <div
              key={item.id}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-dark-800/40 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isBirthday
                      ? "bg-pink-500/20 text-pink-400"
                      : isPositive
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-purple-500/20 text-purple-400"
                  }`}
                >
                  {isBirthday ? (
                    <Cake className="w-4 h-4" />
                  ) : isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <Gift className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-200 truncate">
                    {item.concept}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {formatDate(item.created_at)}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                {isZero ? (
                  <span className="text-xs font-bold text-pink-400">
                    Invitación
                  </span>
                ) : (
                  <span
                    className={`text-xs font-bold font-mono ${
                      isPositive ? "text-emerald-400" : "text-purple-400"
                    }`}
                  >
                    {isPositive ? `+${item.points}` : item.points} pts
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {history.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-center text-xs font-medium text-amber-400/90 hover:text-amber-300 transition"
        >
          {isExpanded ? "Mostrar menos movimientos" : `Ver todos los movimientos (${history.length})`}
        </button>
      )}
    </div>
  );
}
