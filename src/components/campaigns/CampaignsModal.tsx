"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Flame,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { LoyaltyCampaign, CreateCampaignInput } from "@/types/loyalty";
import { CampaignFormModal } from "./CampaignFormModal";

interface CampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_TEMPLATES: Array<{
  name: string;
  badge: string;
  template: Partial<CreateCampaignInput>;
}> = [
  {
    name: "Happy Hour After Office",
    badge: "x2 Puntos",
    template: {
      name: "Happy Hour After Office (x2)",
      description: "Doble puntos en consumos de salón entre las 18:00 y las 20:30 hs de lunes a viernes.",
      multiplier: 2.0,
      bonus_points: 0,
      days_of_week: [1, 2, 3, 4, 5],
      start_time: "18:00",
      end_time: "20:30",
      applicable_sectors: "TABLE",
      priority: 10,
    },
  },
  {
    name: "Almuerzos Días Valle",
    badge: "x1.5 Puntos",
    template: {
      name: "Almuerzos Días Valle (x1.5)",
      description: "Incentivo acelerador para almuerzos de baja demanda los martes y miércoles.",
      multiplier: 1.5,
      bonus_points: 0,
      days_of_week: [2, 3],
      start_time: "12:00",
      end_time: "15:30",
      applicable_sectors: "ALL",
      priority: 5,
    },
  },
  {
    name: "Fin de Semana Delivery",
    badge: "+100 pts Bonus",
    template: {
      name: "Finde Delivery (+100 pts)",
      description: "Bono fijo de 100 puntos extra en pedidos de delivery los fines de semana.",
      multiplier: 1.0,
      bonus_points: 100,
      days_of_week: [5, 6, 0],
      start_time: "19:00",
      end_time: "23:59",
      min_spend: 3000,
      applicable_sectors: "DELIVERY",
      priority: 6,
    },
  },
  {
    name: "Súper Domingo Salón",
    badge: "x3 Puntos",
    template: {
      name: "Súper Domingo Salón (x3)",
      description: "Triple puntos para cerrar el domingo en familia o con amigos en el salón.",
      multiplier: 3.0,
      bonus_points: 0,
      days_of_week: [0],
      start_time: "19:30",
      end_time: "23:30",
      applicable_sectors: "TABLE",
      priority: 8,
    },
  },
];

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function CampaignsModal({ isOpen, onClose }: CampaignsModalProps) {
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedToEdit, setSelectedToEdit] = useState<LoyaltyCampaign | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");

  useEffect(() => {
    let ignore = false;
    if (!isOpen) return;

    fetch("/api/campaigns?all=true")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setCampaigns(data.campaigns);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error al cargar campañas:", err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleStatus = async (camp: LoyaltyCampaign) => {
    const nextStatus = !camp.is_active;
    try {
      const res = await fetch(`/api/campaigns/${camp.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo cambiar el estado de la campaña");
      }
      setCampaigns((prev) =>
        prev.map((c) => (c.id === camp.id ? { ...c, is_active: nextStatus } : c))
      );
      setFeedback({
        type: "success",
        text: `Campaña "${camp.name}" ${nextStatus ? "activada" : "pausada"} correctamente.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Error al cambiar estado",
      });
    }
  };

  const handleDelete = async (camp: LoyaltyCampaign) => {
    const confirm = window.confirm(`¿Estás seguro de eliminar la campaña "${camp.name}"?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/campaigns/${camp.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo eliminar la campaña");
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== camp.id));
      setFeedback({
        type: "success",
        text: `Campaña "${camp.name}" eliminada.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Error al eliminar campaña",
      });
    }
  };

  const handleApplyPreset = (template: Partial<CreateCampaignInput>) => {
    setSelectedToEdit({
      id: "",
      name: template.name || "",
      description: template.description || null,
      multiplier: template.multiplier ?? 2.0,
      bonus_points: template.bonus_points ?? 0,
      days_of_week: template.days_of_week || [1, 2, 3, 4, 5],
      start_time: template.start_time || null,
      end_time: template.end_time || null,
      start_date: null,
      end_date: null,
      min_spend: template.min_spend ?? 0,
      applicable_sectors: template.applicable_sectors || "ALL",
      is_active: true,
      priority: template.priority ?? 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsFormOpen(true);
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === "active") return c.is_active;
    if (filter === "paused") return !c.is_active;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 bg-dark-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Motor de Campañas Dinámicas
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sprint F
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Multiplicadores x2, x3 y bonos por horarios de baja demanda, días valle o eventos especiales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-dark-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs animate-fade-in ${
              feedback.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-red-950/40 border-red-500/40 text-red-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Subheader: Presets & Controls */}
        <div className="p-6 border-b border-dark-800 bg-dark-950/30 space-y-4 shrink-0">
          {/* Quick Presets Row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Plantillas Rápidas Gastronómicas (1-Click)</span>
              </span>
              <span className="text-[11px] text-gray-500">
                Haz clic para cargar y personalizar
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleApplyPreset(tmpl.template)}
                  className="p-2.5 rounded-xl bg-dark-950 hover:bg-dark-800 border border-dark-800 hover:border-amber-500/40 transition text-left flex flex-col justify-between space-y-1 group"
                >
                  <span className="text-xs font-bold text-gray-200 group-hover:text-amber-300 transition line-clamp-1">
                    {tmpl.name}
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 w-max">
                    {tmpl.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action and Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-1.5 bg-dark-950 p-1 rounded-xl border border-dark-800 text-xs">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  filter === "all" ? "bg-amber-500 text-dark-950" : "text-gray-400 hover:text-white"
                }`}
              >
                Todas ({campaigns.length})
              </button>
              <button
                onClick={() => setFilter("active")}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  filter === "active" ? "bg-amber-500 text-dark-950" : "text-gray-400 hover:text-white"
                }`}
              >
                Activas ({campaigns.filter((c) => c.is_active).length})
              </button>
              <button
                onClick={() => setFilter("paused")}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  filter === "paused" ? "bg-amber-500 text-dark-950" : "text-gray-400 hover:text-white"
                }`}
              >
                Pausadas ({campaigns.filter((c) => !c.is_active).length})
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedToEdit(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-dark-950 font-bold text-xs transition-all shadow-md flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Campaña</span>
            </button>
          </div>
        </div>

        {/* Main List Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
              <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
              <p className="text-xs text-gray-400">Cargando motor de campañas dinámicas...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-14 space-y-3 border border-dashed border-dark-800 rounded-2xl bg-dark-950/40">
              <Flame className="w-10 h-10 text-gray-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-300">
                  No hay campañas {filter === "active" ? "activas" : filter === "paused" ? "pausadas" : "creadas"}.
                </p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Crea tu primera campaña o activa una de las plantillas rápidas para incentivar el consumo.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCampaigns.map((camp) => {
                const daysText =
                  camp.days_of_week && camp.days_of_week.length > 0 && camp.days_of_week.length < 7
                    ? camp.days_of_week.map((d) => DAY_NAMES[d] || "").filter(Boolean).join(", ")
                    : "Todos los días";

                const sectorLabel =
                  camp.applicable_sectors === "TABLE"
                    ? "Salón"
                    : camp.applicable_sectors === "COUNTER"
                    ? "Mostrador"
                    : camp.applicable_sectors === "DELIVERY"
                    ? "Delivery"
                    : "Todos";

                return (
                  <div
                    key={camp.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                      camp.is_active
                        ? "bg-dark-950/80 border-dark-750 hover:border-amber-500/40 shadow-sm"
                        : "bg-dark-950/40 border-dark-800/60 opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* Top Row: Title, Badges, Switch */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{camp.name}</span>
                          </h4>
                        </div>
                        {camp.description && (
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                            {camp.description}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {camp.multiplier > 1.0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-dark-950 font-black text-xs shadow-sm">
                            x{camp.multiplier} Pts
                          </span>
                        )}
                        {camp.bonus_points > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                            +{camp.bonus_points} pts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dark-800/80 text-[11px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{daysText}</span>
                      </div>

                      {(camp.start_time || camp.end_time) && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          <span>
                            {camp.start_time || "00:00"} - {camp.end_time || "23:59"} hs
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-amber-400 font-medium">{sectorLabel}</span>
                      </div>

                      {camp.min_spend > 0 && (
                        <span className="text-gray-400">
                          Mín: ${camp.min_spend.toLocaleString("es-AR")}
                        </span>
                      )}

                      <span className="text-[10px] text-gray-500 ml-auto">
                        Prioridad {camp.priority}
                      </span>
                    </div>

                    {/* Footer Actions: Active Toggle, Edit, Delete */}
                    <div className="pt-2 border-t border-dark-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(camp)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            camp.is_active ? "bg-amber-500" : "bg-dark-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              camp.is_active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-gray-400">
                          {camp.is_active ? (
                            <span className="text-amber-400 font-semibold">Activa</span>
                          ) : (
                            "Pausada"
                          )}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedToEdit(camp);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition"
                          title="Modificar campaña"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(camp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition"
                          title="Eliminar campaña"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-dark-800 bg-dark-950/70 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span>
            {campaigns.filter((c) => c.is_active).length} activas de {campaigns.length} campañas
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-white font-medium transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Submodal for Creation / Editing */}
      <CampaignFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedToEdit(null);
        }}
        campaignToEdit={selectedToEdit}
        onSaveSuccess={(saved) => {
          setCampaigns((prev) => {
            const exists = prev.some((c) => c.id === saved.id);
            if (exists) {
              return prev.map((c) => (c.id === saved.id ? saved : c));
            }
            return [saved, ...prev];
          });
          setFeedback({
            type: "success",
            text: `Campaña "${saved.name}" guardada con éxito.`,
          });
        }}
      />
    </div>
  );
}
