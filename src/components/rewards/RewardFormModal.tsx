"use client";

import React, { useState } from "react";
import { X, Award, CheckCircle2, AlertCircle, RefreshCw, Coins, Calendar, Sparkles } from "lucide-react";
import { LoyaltyReward, RewardType } from "@/types/loyalty";

interface RewardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  rewardToEdit?: LoyaltyReward | null;
  onSaveSuccess: (savedReward: LoyaltyReward) => void;
}

export function RewardFormModal(props: RewardFormModalProps) {
  if (!props.isOpen) return null;
  return <RewardFormDialog key={props.rewardToEdit?.id ?? "new"} {...props} />;
}

function RewardFormDialog({
  onClose,
  rewardToEdit,
  onSaveSuccess,
}: RewardFormModalProps) {
  const [name, setName] = useState(rewardToEdit?.name || "");
  const [rewardType, setRewardType] = useState<RewardType>(rewardToEdit?.reward_type || "POINTS");
  const [requirementValue, setRequirementValue] = useState<number>(rewardToEdit?.requirement_value ?? 300);
  const [description, setDescription] = useState(rewardToEdit?.description || "");
  const [isActive, setIsActive] = useState(rewardToEdit ? rewardToEdit.is_active : true);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Debes ingresar el nombre del premio.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const isEdit = Boolean(rewardToEdit?.id);
    const url = isEdit ? `/api/rewards/${rewardToEdit!.id}` : "/api/rewards";
    const method = isEdit ? "PUT" : "POST";

    const payload = {
      name: name.trim(),
      reward_type: rewardType,
      requirement_value: rewardType === "BIRTHDAY_GIFT" ? 0 : Number(requirementValue),
      description: description.trim(),
      is_active: isActive,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar el premio");
      }

      onSaveSuccess(data.reward);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al procesar la solicitud");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-bumeran-500/10 border border-bumeran-500/20 text-bumeran-500 dark:text-bumeran-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {rewardToEdit ? "Modificar Premio / Canje" : "Nuevo Premio o Canje"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {rewardToEdit
                  ? "Edita las condiciones o puntos requeridos del beneficio"
                  : "Configura un nuevo plato, bebida o beneficio de fidelización"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Nombre de la Recompensa / Plato
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Hamburguesa Doble con Papas Rústicas"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-bumeran-500"
              required
            />
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Mecánica de Canje / Tipo
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRewardType("POINTS");
                  if (requirementValue === 0) setRequirementValue(300);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-1 ${
                  rewardType === "POINTS"
                    ? "bg-bumeran-50 dark:bg-bumeran-600/20 border-bumeran-500 text-bumeran-600 dark:text-bumeran-400"
                    : "bg-white dark:bg-dark-950 border-slate-200 dark:border-dark-800 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Puntos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRewardType("VISIT_MILESTONE");
                  if (requirementValue > 50 || requirementValue === 0) setRequirementValue(5);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-1 ${
                  rewardType === "VISIT_MILESTONE"
                    ? "bg-purple-50 dark:bg-purple-600/20 border-purple-500 text-purple-600 dark:text-purple-400"
                    : "bg-white dark:bg-dark-950 border-slate-200 dark:border-dark-800 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Hito Visita</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRewardType("BIRTHDAY_GIFT");
                  setRequirementValue(0);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-1 ${
                  rewardType === "BIRTHDAY_GIFT"
                    ? "bg-amber-50 dark:bg-amber-600/20 border-amber-500 text-amber-600 dark:text-amber-400"
                    : "bg-white dark:bg-dark-950 border-slate-200 dark:border-dark-800 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Cumpleaños</span>
              </button>
            </div>
          </div>

          {/* Requirement value */}
          {rewardType !== "BIRTHDAY_GIFT" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                {rewardType === "POINTS" ? "Puntos Requeridos para Canje" : "Número de Visita Exigida (Hito)"}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={requirementValue}
                onChange={(e) => setRequirementValue(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-bumeran-500 font-mono"
                required
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              Las cortesías de cumpleaños no requieren puntos (0 pts). Se habilitan automáticamente para comensales en su semana natalicia (con antifraude anual).
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Descripción / Condiciones de Entrega
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: A elección de la carta dulce. Válido en salón."
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-bumeran-500"
            />
          </div>

          {/* Active switch */}
          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="rewardActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded bg-white dark:bg-dark-950 border-slate-300 dark:border-dark-700 text-bumeran-500 focus:ring-bumeran-500"
            />
            <label htmlFor="rewardActive" className="text-xs font-medium text-slate-700 dark:text-gray-300 cursor-pointer">
              Beneficio activo y disponible en el catálogo de caja
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-dark-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-xs font-semibold text-slate-700 dark:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 text-white font-bold text-xs shadow-glow transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? "Guardando..." : rewardToEdit ? "Guardar Cambios" : "Crear Premio"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
