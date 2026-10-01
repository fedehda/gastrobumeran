"use client";

import React, { useState } from "react";
import { History, Receipt, Award, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { PointsHistory, Sale } from "@/types/loyalty";

interface CustomerHistoryProps {
  pointsHistory: PointsHistory[];
  sales: Sale[];
}

export function CustomerHistory({ pointsHistory, sales }: CustomerHistoryProps) {
  const [activeTab, setActiveTab] = useState<"points" | "sales">("points");

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-2xl bg-dark-900/90 border border-dark-750 p-5 backdrop-blur-xl shadow-card">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-dark-800">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="font-bold text-white text-base">Historial del Comensal</h3>
        </div>

        <div className="flex items-center p-1 bg-dark-950 rounded-xl border border-dark-800">
          <button
            onClick={() => setActiveTab("points")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "points"
                ? "bg-bumeran-500/20 text-bumeran-400 border border-bumeran-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Puntos ({pointsHistory.length})
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "sales"
                ? "bg-bumeran-500/20 text-bumeran-400 border border-bumeran-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Ventas ({sales.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-h-72 overflow-y-auto pr-1">
        {activeTab === "points" ? (
          pointsHistory.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              No hay movimientos de puntos registrados aún.
            </div>
          ) : (
            <div className="divide-y divide-dark-800/80">
              {pointsHistory.map((item) => {
                const isPositive = item.points > 0;
                const isZero = item.points === 0;
                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isPositive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : isZero
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : isZero ? (
                          <Award className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-200">{item.concept}</div>
                        <div className="text-[10px] text-gray-500 flex items-center mt-0.5">
                          <Clock className="w-2.5 h-2.5 mr-1" />
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-xs font-bold ${
                        isPositive ? "text-emerald-400" : isZero ? "text-blue-400" : "text-red-400"
                      }`}
                    >
                      {isPositive ? `+${item.points} pts` : isZero ? "Hito Visita" : `${item.points} pts`}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">
            No hay ventas registradas aún para este cliente.
          </div>
        ) : (
          <div className="divide-y divide-dark-800/80">
            {sales.map((sale) => (
              <div key={sale.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-dark-950 border border-dark-800 flex items-center justify-center text-gray-400">
                    <Receipt className="w-4 h-4 text-bumeran-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-200">
                      Ticket #{sale.id.slice(0, 8)} • Fuente: <span className="text-bumeran-400 font-semibold">{sale.source}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 flex items-center mt-0.5">
                      <Clock className="w-2.5 h-2.5 mr-1" />
                      {formatDate(sale.sale_date)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-white">
                    ${sale.total_amount.toLocaleString("es-AR")}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">Cerrada</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
