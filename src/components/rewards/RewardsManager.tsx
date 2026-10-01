"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  Power,
  Coins,
  Calendar,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { LoyaltyReward } from "@/types/loyalty";
import { RewardFormModal } from "./RewardFormModal";

export function RewardsManager() {
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRewardToEdit, setSelectedRewardToEdit] = useState<LoyaltyReward | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");

  useEffect(() => {
    let ignore = false;
    fetch("/api/rewards?all=true")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setRewards(data.rewards);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error al cargar recompensas:", err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleStatus = async (reward: LoyaltyReward) => {
    const nextStatus = !reward.is_active;
    try {
      const res = await fetch(`/api/rewards/${reward.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo cambiar el estado");
      }

      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, is_active: nextStatus } : r))
      );
      setFeedback({
        type: "success",
        text: `Premio "${reward.name}" ${nextStatus ? "activado" : "pausado"} para caja.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Error al cambiar estado",
      });
    }
  };

  const handleDelete = async (reward: LoyaltyReward) => {
    if (reward.reward_type === "BIRTHDAY_GIFT") {
      setFeedback({
        type: "error",
        text: "No se puede eliminar la cortesía especial de cumpleaños.",
      });
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar el premio "${reward.name}" del catálogo?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/rewards/${reward.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo eliminar el premio");
      }

      setRewards((prev) => prev.filter((r) => r.id !== reward.id));
      setFeedback({
        type: "success",
        text: `Premio "${reward.name}" eliminado correctamente.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Error al eliminar",
      });
    }
  };

  const filteredRewards = rewards.filter((r) => {
    if (filter === "active") return r.is_active;
    if (filter === "paused") return !r.is_active;
    return true;
  });

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-xl space-y-5 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dark-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-bumeran-500/10 border border-bumeran-500/20 text-bumeran-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Gestor de Catálogo de Premios & Canjes (CRUD)
            </h3>
            <p className="text-xs text-gray-400">
              Crea, modifica y pausa los beneficios canjeables por puntos, visitas o cumpleaños
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Filters */}
          <div className="flex rounded-xl bg-dark-950 p-1 border border-dark-800 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filter === "all" ? "bg-dark-800 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Todos ({rewards.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filter === "active" ? "bg-dark-800 text-emerald-400" : "text-gray-400 hover:text-white"
              }`}
            >
              Activos ({rewards.filter((r) => r.is_active).length})
            </button>
            <button
              onClick={() => setFilter("paused")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filter === "paused" ? "bg-dark-800 text-amber-400" : "text-gray-400 hover:text-white"
              }`}
            >
              Pausados ({rewards.filter((r) => !r.is_active).length})
            </button>
          </div>

          {/* New Reward Button */}
          <button
            onClick={() => {
              setSelectedRewardToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 text-white font-bold text-xs shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Premio</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-white ml-2 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Rewards Grid */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-bumeran-400" />
          <p className="text-xs text-gray-400">Cargando catálogo de beneficios...</p>
        </div>
      ) : filteredRewards.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-500">
          No hay premios configurados en esta vista. Haz clic en &quot;Nuevo Premio&quot; para crear uno.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.map((reward) => (
            <div
              key={reward.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                reward.is_active
                  ? "bg-dark-950/60 border-dark-800 hover:border-dark-700"
                  : "bg-dark-950/30 border-dark-850 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {/* Type Badge */}
                  <div className="flex items-center space-x-1.5">
                    {reward.reward_type === "POINTS" ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-bumeran-500/10 text-bumeran-400 border border-bumeran-500/20 text-[10px] font-bold">
                        <Coins className="w-3 h-3" />
                        <span>Puntos</span>
                      </span>
                    ) : reward.reward_type === "VISIT_MILESTONE" ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
                        <Calendar className="w-3 h-3" />
                        <span>Hito Visita</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                        <Sparkles className="w-3 h-3" />
                        <span>Cumpleaños</span>
                      </span>
                    )}

                    {/* Active/Paused status */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        reward.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                      }`}
                    >
                      {reward.is_active ? "Activo" : "Pausado"}
                    </span>
                  </div>

                  {/* Requirement Badge */}
                  <div className="font-mono text-xs font-black text-white">
                    {reward.reward_type === "POINTS" ? (
                      <span className="text-amber-400">{reward.requirement_value} pts</span>
                    ) : reward.reward_type === "VISIT_MILESTONE" ? (
                      <span className="text-purple-400">Visita #{reward.requirement_value}</span>
                    ) : (
                      <span className="text-amber-400">Cortesía $0</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{reward.name}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">
                    {reward.description || "Sin descripción adicional."}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-dark-850 flex items-center justify-between text-xs">
                {/* Toggle status switch */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(reward)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    reward.is_active
                      ? "bg-dark-850 hover:bg-dark-800 text-gray-300"
                      : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                  }`}
                  title={reward.is_active ? "Pausar beneficio" : "Activar beneficio"}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{reward.is_active ? "Pausar" : "Activar"}</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRewardToEdit(reward);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-gray-300 hover:text-white transition-colors"
                    title="Editar premio"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  {reward.reward_type !== "BIRTHDAY_GIFT" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(reward)}
                      className="p-1.5 rounded-lg bg-dark-850 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                      title="Eliminar premio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create/Edit */}
      <RewardFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rewardToEdit={selectedRewardToEdit}
        onSaveSuccess={(saved) => {
          setRewards((prev) => {
            const exists = prev.some((r) => r.id === saved.id);
            if (exists) {
              return prev.map((r) => (r.id === saved.id ? saved : r));
            }
            return [saved, ...prev];
          });
          setFeedback({
            type: "success",
            text: `Premio "${saved.name}" guardado exitosamente.`,
          });
        }}
      />
    </div>
  );
}
