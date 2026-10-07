"use client";

import React, { useState } from "react";
import { History, Receipt, Award, ArrowUpRight, ArrowDownRight, Clock, Ban, AlertTriangle, RefreshCw, X } from "lucide-react";
import { PointsHistory, Sale, Customer } from "@/types/loyalty";

interface CustomerHistoryProps {
  pointsHistory: PointsHistory[];
  sales: Sale[];
  onSaleCanceled?: (updatedCustomer: Customer, message: string) => void;
}

export function CustomerHistory({ pointsHistory, sales, onSaleCanceled }: CustomerHistoryProps) {
  const [activeTab, setActiveTab] = useState<"points" | "sales">("points");
  const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState("Anulación manual en caja");
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

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

  const handleConfirmVoid = async () => {
    if (!saleToVoid) return;
    setIsVoiding(true);
    setVoidError(null);

    try {
      const res = await fetch(`/api/sales/${saleToVoid.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason.trim() || "Anulación manual en caja" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo anular la venta");
      }

      setSaleToVoid(null);
      setVoidReason("Anulación manual en caja");
      if (onSaleCanceled && data.data?.customer) {
        onSaleCanceled(data.data.customer, data.message || "Venta anulada correctamente");
      }
    } catch (err: unknown) {
      setVoidError(err instanceof Error ? err.message : "Error al anular la venta");
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-dark-900/90 border border-slate-200 dark:border-dark-750 p-5 backdrop-blur-xl shadow-card relative transition-colors duration-200">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-dark-800">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-slate-400 dark:text-gray-400" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Historial del Comensal</h3>
        </div>

        <div className="flex items-center p-1 bg-slate-100 dark:bg-dark-950 rounded-xl border border-slate-200 dark:border-dark-800">
          <button
            onClick={() => setActiveTab("points")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "points"
                ? "bg-bumeran-500/20 text-bumeran-600 dark:text-bumeran-400 border border-bumeran-500/30"
                : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Puntos ({pointsHistory.length})
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "sales"
                ? "bg-bumeran-500/20 text-bumeran-600 dark:text-bumeran-400 border border-bumeran-500/30"
                : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
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
            <div className="text-center py-8 text-xs text-slate-500 dark:text-gray-500">
              No hay movimientos de puntos registrados aún.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-dark-800/80">
              {pointsHistory.map((item) => {
                const isPositive = item.points > 0;
                const isZero = item.points === 0;
                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isPositive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : isZero
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
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
                        <div className="text-xs font-medium text-slate-800 dark:text-gray-200">{item.concept}</div>
                        <div className="text-[10px] text-slate-500 dark:text-gray-500 flex items-center mt-0.5">
                          <Clock className="w-2.5 h-2.5 mr-1" />
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-xs font-bold ${
                        isPositive ? "text-emerald-600 dark:text-emerald-400" : isZero ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
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
          <div className="text-center py-8 text-xs text-slate-500 dark:text-gray-500">
            No hay ventas registradas aún para este cliente.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-dark-800/80">
            {sales.map((sale) => {
              const isCanceled = sale.status === "CANCELED";
              return (
                <div key={sale.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
                      isCanceled
                        ? "bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400"
                        : "bg-slate-100 dark:bg-dark-950 border-slate-200 dark:border-dark-800 text-bumeran-600 dark:text-bumeran-400"
                    }`}>
                      {isCanceled ? <Ban className="w-3.5 h-3.5" /> : <Receipt className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-800 dark:text-gray-200 flex items-center space-x-1.5">
                        <span className={isCanceled ? "line-through text-slate-400 dark:text-gray-400" : ""}>
                          Ticket #{sale.id.slice(0, 8)}
                        </span>
                        <span className="text-slate-400 dark:text-gray-500">•</span>
                        <span className="text-bumeran-600 dark:text-bumeran-400 font-semibold">{sale.source}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-gray-500 flex items-center mt-0.5">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        {formatDate(sale.sale_date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className={`text-xs font-bold ${isCanceled ? "line-through text-slate-400 dark:text-gray-400" : "text-slate-900 dark:text-white"}`}>
                        ${sale.total_amount.toLocaleString("es-AR")}
                      </div>
                      {isCanceled ? (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          Anulada
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Cerrada</span>
                      )}
                    </div>

                    {!isCanceled && (
                      <button
                        onClick={() => {
                          setSaleToVoid(sale);
                          setVoidError(null);
                        }}
                        title="Anular venta y revertir puntos/visita"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 dark:bg-dark-950 dark:hover:bg-red-500/20 border border-slate-200 dark:border-dark-800 hover:border-red-500/30 text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors shadow-sm"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal to Void Sale */}
      {saleToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200 dark:border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-dark-800">
              <div className="flex items-center space-x-2.5 text-red-500 dark:text-red-400 font-bold">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                </div>
                <span>Confirmar Anulación de Venta</span>
              </div>
              <button
                onClick={() => setSaleToVoid(null)}
                disabled={isVoiding}
                className="text-slate-400 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-gray-400">Ticket:</span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">#{saleToVoid.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-gray-400">Monto:</span>
                <span className="text-slate-900 dark:text-white font-bold">${saleToVoid.total_amount.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-gray-400">Origen:</span>
                <span className="text-bumeran-600 dark:text-bumeran-400 font-semibold">{saleToVoid.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-gray-400">Fecha:</span>
                <span className="text-slate-700 dark:text-gray-300">{formatDate(saleToVoid.sale_date)}</span>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-300">
              <strong>Impacto en fidelización:</strong> Se deducirán los puntos acreditados por esta venta del saldo del comensal y se revertirá la visita si correspondió.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                Motivo de anulación:
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Ej: Error de carga, comanda cancelada en mesa..."
                disabled={isVoiding}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-750 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {voidError && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-600 dark:text-red-200">
                {voidError}
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSaleToVoid(null)}
                disabled={isVoiding}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:hover:bg-dark-750 dark:text-gray-300 border border-slate-200 dark:border-transparent text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={isVoiding}
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-glow disabled:opacity-50"
              >
                {isVoiding ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
                <span>{isVoiding ? "Anulando..." : "Confirmar Anulación"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
