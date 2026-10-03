"use client";

import React, { useState } from "react";
import {
  X,
  Flame,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Zap,
  Sparkles,
  Layers,
} from "lucide-react";
import { LoyaltyCampaign, CreateCampaignInput, CampaignSector } from "@/types/loyalty";

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignToEdit?: LoyaltyCampaign | null;
  onSaveSuccess: (savedCampaign: LoyaltyCampaign) => void;
}

const DAYS_LIST: Array<{ value: number; label: string; short: string }> = [
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 0, label: "Domingo", short: "Dom" },
];

export function CampaignFormModal(props: CampaignFormModalProps) {
  if (!props.isOpen) return null;
  return <CampaignFormDialog key={props.campaignToEdit?.id ?? "new"} {...props} />;
}

function CampaignFormDialog({
  onClose,
  campaignToEdit,
  onSaveSuccess,
}: CampaignFormModalProps) {
  const [name, setName] = useState(campaignToEdit?.name || "");
  const [description, setDescription] = useState(campaignToEdit?.description || "");
  const [multiplier, setMultiplier] = useState<number>(campaignToEdit?.multiplier ?? 2.0);
  const [bonusPoints, setBonusPoints] = useState<number>(campaignToEdit?.bonus_points ?? 0);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    campaignToEdit?.days_of_week && campaignToEdit.days_of_week.length > 0
      ? campaignToEdit.days_of_week
      : [1, 2, 3, 4, 5, 6, 0]
  );
  const [startTime, setStartTime] = useState(campaignToEdit?.start_time || "");
  const [endTime, setEndTime] = useState(campaignToEdit?.end_time || "");
  const [startDate, setStartDate] = useState(campaignToEdit?.start_date || "");
  const [endDate, setEndDate] = useState(campaignToEdit?.end_date || "");
  const [minSpend, setMinSpend] = useState<number>(campaignToEdit?.min_spend ?? 0);
  const [applicableSectors, setApplicableSectors] = useState<CampaignSector>(
    campaignToEdit?.applicable_sectors || "ALL"
  );
  const [priority, setPriority] = useState<number>(campaignToEdit?.priority ?? 1);
  const [isActive, setIsActive] = useState<boolean>(
    campaignToEdit ? campaignToEdit.is_active : true
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleDay = (dayVal: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]
    );
  };

  const selectAllDays = () => setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
  const selectWeekdays = () => setSelectedDays([1, 2, 3, 4, 5]);
  const selectWeekends = () => setSelectedDays([6, 0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("El nombre de la campaña es obligatorio.");
      return;
    }
    if (selectedDays.length === 0) {
      setErrorMsg("Selecciona al menos un día de la semana.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const isEdit = Boolean(campaignToEdit?.id);
    const url = isEdit ? `/api/campaigns/${campaignToEdit!.id}` : "/api/campaigns";
    const method = isEdit ? "PUT" : "POST";

    const payload: CreateCampaignInput = {
      name: name.trim(),
      description: description.trim() || null,
      multiplier: Number(multiplier) || 1.0,
      bonus_points: Number(bonusPoints) || 0,
      days_of_week: selectedDays,
      start_time: startTime || null,
      end_time: endTime || null,
      start_date: startDate || null,
      end_date: endDate || null,
      min_spend: Number(minSpend) || 0,
      applicable_sectors: applicableSectors,
      priority: Number(priority) || 1,
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
        throw new Error(data.error || "Error al guardar la campaña");
      }

      onSaveSuccess(data.campaign);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al procesar la solicitud");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 bg-dark-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {campaignToEdit ? "Modificar Campaña Dinámica" : "Nueva Campaña Promocional"}
              </h3>
              <p className="text-xs text-gray-400">
                {campaignToEdit
                  ? "Actualiza reglas temporales, multiplicadores y canales"
                  : "Crea multiplicadores para horarios valle, días de baja demanda o eventos"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Nombre de la Campaña *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Happy Hour After Office (x2)"
                required
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-750 focus:border-amber-500 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Descripción / Beneficio Visible para el Cliente
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Ej. Doble puntos en consumos de salón entre las 18:00 y las 20:30 hs de lunes a viernes."
                className="w-full px-3.5 py-2 bg-dark-950 border border-dark-750 focus:border-amber-500 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all placeholder-gray-600 resize-none"
              />
            </div>
          </div>

          {/* Multiplier & Fixed Bonus Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 space-y-1.5">
              <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Multiplicador de Puntos</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="10.0"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1.0)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white font-black text-base focus:border-amber-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-gray-400 shrink-0">x base</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Ej: 2.0 = Doble puntos, 1.5 = +50% extra.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 space-y-1.5">
              <label className="block text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Puntos Fijos Adicionales (Bonus)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white font-black text-base focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-gray-400 shrink-0">+ pts</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Puntos directos que se suman además del multiplicador.
              </p>
            </div>
          </div>

          {/* Days of Week Selector */}
          <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Días de Aplicación Semanal *</span>
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-700 text-gray-300"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={selectWeekdays}
                  className="px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-700 text-gray-300"
                >
                  Lun-Vie
                </button>
                <button
                  type="button"
                  onClick={selectWeekends}
                  className="px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-700 text-gray-300"
                >
                  Sáb-Dom
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_LIST.map((day) => {
                const isSelected = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all text-center border ${
                      isSelected
                        ? "bg-amber-500 text-dark-950 border-amber-400 shadow-sm"
                        : "bg-dark-900 hover:bg-dark-850 text-gray-400 border-dark-750"
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Window (HH:mm) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Hora Inicio (opcional)</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-750 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500">Ej: 18:00</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Hora Fin (opcional)</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-750 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500">Ej: 20:30 (deja vacío para todo el día)</span>
            </div>
          </div>

          {/* Date Window (YYYY-MM-DD, optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>Fecha Inicio de Vigencia (opcional)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-750 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500">Válida desde esta fecha</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>Fecha Fin de Vigencia (opcional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-750 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500">Válida hasta esta fecha (o indefinida)</span>
            </div>
          </div>

          {/* Sectors & Minimum Spend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-gray-400" />
                <span>Canal / Sector de Venta</span>
              </label>
              <select
                value={applicableSectors}
                onChange={(e) => setApplicableSectors(e.target.value as CampaignSector)}
                className="w-full px-3 py-2.5 bg-dark-950 border border-dark-750 rounded-xl text-gray-200 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="ALL">Todos los Canales</option>
                <option value="TABLE">Salón / Mesas</option>
                <option value="COUNTER">Mostrador / Take Away</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Gasto Mínimo Requerido ($)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={minSpend}
                onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-dark-950 border border-dark-750 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500">0 = Sin mínimo requerido</span>
            </div>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Prioridad de Desempate (1 a 10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-750 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500">Mayor prioridad gana si hay superposición</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-dark-950 border border-dark-800">
              <div>
                <span className="block text-xs font-bold text-white">Estado de la Campaña</span>
                <span className="text-[11px] text-gray-400">
                  {isActive ? "Activa (evalúa en caja y Fudo)" : "Pausada temporalmente"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? "bg-amber-500" : "bg-dark-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-dark-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-dark-950 text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-dark-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{campaignToEdit ? "Guardar Cambios" : "Crear Campaña"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
