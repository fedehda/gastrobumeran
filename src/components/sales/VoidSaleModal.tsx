"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Ban,
  Search,
  Receipt,
  X,
  Clock,
  AlertTriangle,
  RefreshCw,
  User,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Customer } from "@/types/loyalty";

interface SaleListItem {
  id: string;
  external_sale_id: string | null;
  customer_id: string | null;
  source: string;
  total_amount: number;
  sale_date: string;
  status: string;
  visit_added: boolean;
  customer_name: string | null;
  customer_doc: string | null;
  customer_phone: string | null;
  points_earned: number;
}

interface VoidSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCanceled?: (updatedCustomer?: Customer, message?: string) => void;
}

export function VoidSaleModal({ isOpen, onClose, onSaleCanceled }: VoidSaleModalProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CLOSED" | "CANCELED">("ALL");
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected sale for cancellation
  const [selectedSale, setSelectedSale] = useState<SaleListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("Anulación manual en caja");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchSales = useCallback(async (searchQuery = "", status = "ALL") => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      if (status !== "ALL") params.set("status", status);
      params.set("limit", "40");

      const res = await fetch(`/api/sales?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al cargar el listado de ventas");
      }
      setSales(data.sales || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al consultar ventas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    params.set("limit", "40");

    fetch(`/api/sales?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setSales(data.sales || []);
        } else {
          setError(data.error || "Error al cargar el listado de ventas");
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Error al consultar ventas");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, statusFilter, query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales(query, statusFilter);
  };

  const handleConfirmCancel = async () => {
    if (!selectedSale) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/sales/${selectedSale.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() || "Anulación manual en caja" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo anular la venta");
      }

      setSuccessNotice(`¡Venta #${selectedSale.id.slice(0, 8)} anulada con éxito!`);
      setSelectedSale(null);
      setCancelReason("Anulación manual en caja");

      // Refresh list
      fetchSales(query, statusFilter);

      if (onSaleCanceled) {
        onSaleCanceled(data.data?.customer, data.message || "Venta anulada correctamente");
      }

      setTimeout(() => {
        setSuccessNotice(null);
      }, 5000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error al anular la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleClose = () => {
    setSelectedSale(null);
    setActionError(null);
    setSuccessNotice(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 bg-dark-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Módulo de Anulación de Ventas
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Rollback Atómico
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Búsqueda y anulación manual de tickets con reversión de puntos y visitas
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters Bar */}
        <div className="p-4 border-b border-dark-800 bg-dark-950/40 shrink-0 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por Ticket #, Fudo ID, Nombre del comensal, DNI o Teléfono..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-dark-900 border border-dark-750 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    fetchSales("", statusFilter);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-glow disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Buscar</span>
            </button>
          </form>

          {/* Filter Pills */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400 text-[11px] font-semibold">Estado:</span>
              <div className="flex items-center space-x-1 p-0.5 bg-dark-900 rounded-lg border border-dark-800">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    statusFilter === "ALL"
                      ? "bg-dark-800 text-white border border-dark-700"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setStatusFilter("CLOSED")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    statusFilter === "CLOSED"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Activas / Cerradas
                </button>
                <button
                  onClick={() => setStatusFilter("CANCELED")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    statusFilter === "CANCELED"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Anuladas
                </button>
              </div>
            </div>

            <div className="text-gray-400 text-[11px]">
              {sales.length} {sales.length === 1 ? "resultado" : "resultados"}
            </div>
          </div>
        </div>

        {/* Notifications */}
        {successNotice && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sales List Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-red-400" />
              <p className="text-sm text-gray-400">Consultando tickets de venta...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-dark-950 border border-dark-800 flex items-center justify-center mx-auto text-gray-500">
                <Receipt className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-400">No se encontraron ventas para el criterio especificado.</p>
              <p className="text-xs text-gray-500">Prueba ajustando el texto de búsqueda o el filtro de estado.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sales.map((sale) => {
                const isCanceled = sale.status === "CANCELED";
                return (
                  <div
                    key={sale.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isCanceled
                        ? "bg-dark-950/40 border-dark-800/80 opacity-75"
                        : "bg-dark-950/80 border-dark-800 hover:border-dark-750"
                    }`}
                  >
                    {/* Left: Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          #{sale.id.slice(0, 8)}
                        </span>

                        {sale.external_sale_id && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            Fudo #{sale.external_sale_id}
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dark-800 text-gray-300 border border-dark-700">
                          {sale.source}
                        </span>

                        {isCanceled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            Anulada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Cerrada
                          </span>
                        )}

                        {sale.visit_added && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            +1 Visita
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 pt-1">
                        <div className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span className={sale.customer_name ? "text-gray-200 font-medium" : "text-gray-500 italic"}>
                            {sale.customer_name || "Sin Comensal Asignado"}
                          </span>
                          {sale.customer_doc && (
                            <span className="text-[11px] text-gray-500">({sale.customer_doc})</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(sale.sale_date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amounts and Actions */}
                    <div className="flex items-center justify-between md:justify-end space-x-4 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-dark-800">
                      <div className="text-right">
                        <div className={`text-sm font-bold ${isCanceled ? "line-through text-gray-500" : "text-white"}`}>
                          ${sale.total_amount.toLocaleString("es-AR")}
                        </div>
                        <div className="text-[11px] text-amber-400 font-semibold">
                          +{sale.points_earned} pts
                        </div>
                      </div>

                      {!isCanceled ? (
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setActionError(null);
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-600 text-xs font-bold transition-all shadow-sm"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Anular</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500 italic px-2 py-1">
                          Sin acciones
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-950/70 shrink-0 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            ℹ️ Al anular una venta, se descuentan los puntos emitidos y se retira el sello de visita.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Sub-Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-dark-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <div className="flex items-center space-x-2.5 text-red-400 font-bold">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <span>Confirmar Anulación de Venta</span>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">ID de Ticket:</span>
                <span className="font-mono text-white font-bold">#{selectedSale.id}</span>
              </div>
              {selectedSale.external_sale_id && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Fudo Sale ID:</span>
                  <span className="text-sky-400 font-mono font-semibold">#{selectedSale.external_sale_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Comensal:</span>
                <span className="text-white font-medium">
                  {selectedSale.customer_name || "Sin comensal asignado"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monto:</span>
                <span className="text-white font-bold">${selectedSale.total_amount.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Puntos a descontar:</span>
                <span className="text-amber-400 font-bold">-{selectedSale.points_earned} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sello de visita:</span>
                <span className={selectedSale.visit_added ? "text-red-400 font-semibold" : "text-gray-500"}>
                  {selectedSale.visit_added ? "Se descontará 1 visita" : "No acumuló visita"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              <strong>Atención:</strong> Esta acción no se puede deshacer. Se descontarán los puntos del comensal y se revertirá el hito de visita en el motor de fidelización.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Motivo de anulación:
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Comanda anulada en Fudo, error de facturación..."
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-950 border border-dark-750 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-200">
                {actionError}
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-glow disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
                <span>{isSubmitting ? "Anulando..." : "Confirmar Anulación"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
