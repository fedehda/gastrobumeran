"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Users,
  Receipt,
  Coins,
  History,
  Key,
  Database,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { TestDataCounts, ResetTestDataResult } from "@/lib/db/maintenance-repo";

interface TestEnvironmentManagerProps {
  onOpenFudoModal?: () => void;
  onDataPurged?: () => void;
}

export function TestEnvironmentManager({
  onOpenFudoModal,
  onDataPurged,
}: TestEnvironmentManagerProps) {
  const [counts, setCounts] = useState<TestDataCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetFudoSync, setResetFudoSync] = useState(true);
  const [resetCronLogs, setResetCronLogs] = useState(true);
  const [purgeResult, setPurgeResult] = useState<ResetTestDataResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/reset-test-data");
      const data = await res.json();
      if (data.success) {
        setCounts(data.counts);
      } else {
        setErrorMsg(data.error || "No se pudieron obtener las métricas de prueba");
      }
    } catch (err) {
      console.error("Error al cargar estado del entorno:", err);
      setErrorMsg("Error de conexión al consultar datos de prueba.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/reset-test-data")
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.success) {
          setCounts(data.counts);
        } else {
          setErrorMsg(data.error || "No se pudieron obtener las métricas de prueba");
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        console.error("Error al cargar estado del entorno:", err);
        setErrorMsg("Error de conexión al consultar datos de prueba.");
        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== "BORRAR") {
      setErrorMsg("Debes tipear exactamente la palabra 'BORRAR' para confirmar.");
      return;
    }

    setIsPurging(true);
    setErrorMsg(null);
    setPurgeResult(null);

    try {
      const res = await fetch("/api/admin/reset-test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: confirmText.trim(),
          resetFudoSync,
          resetCronLogs,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setPurgeResult(data.result);
        setConfirmText("");
        await fetchCounts();
        if (onDataPurged) onDataPurged();
      } else {
        setErrorMsg(data.error || "Error al purgar los datos de prueba");
      }
    } catch (err) {
      console.error("Error en purge:", err);
      setErrorMsg("Error de red al ejecutar el reseteo.");
    } finally {
      setIsPurging(false);
    }
  };

  const isConfirmValid = confirmText.trim().toUpperCase() === "BORRAR";
  const hasDataToWipe = counts
    ? counts.customers > 0 || counts.sales > 0 || counts.pointsBatches > 0
    : false;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Gestión de Entorno de Pruebas & Lanzamiento a Producción
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Puesta a Punto
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Permite validar todas las funcionalidades con el restaurante usando datos reales o ficticios, y
              limpiar quirúrgicamente la base de datos para arrancar desde cero cuando se lance el programa de fidelización.
            </p>
          </div>
        </div>

        <button
          onClick={fetchCounts}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-dark-700 text-xs font-semibold transition-all self-start md:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-bumeran-400" : ""}`} />
          <span>Actualizar Estado</span>
        </button>
      </div>

      {/* Fudo API Status Info Card */}
      {counts && (
        <div className="p-4 rounded-xl bg-dark-900/80 border border-dark-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-dark-800 border border-dark-750 text-bumeran-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Modo de Integración Fudo:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md ${
                    counts.fudoStatus.isSandbox
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {counts.fudoStatus.isSandbox ? "Simulador Sandbox (Demo)" : "API Pública Real Fudo POS"}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 flex items-center space-x-2">
                <span>Clave activa: <code className="text-gray-200">{counts.fudoStatus.maskedApiKey}</code></span>
                {counts.fudoStatus.lastSyncAt && (
                  <>
                    <span>•</span>
                    <span>Última sincronización: <strong className="text-gray-300">{new Date(counts.fudoStatus.lastSyncAt).toLocaleString()}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {onOpenFudoModal && (
            <button
              onClick={onOpenFudoModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-bumeran-500/10 hover:bg-bumeran-500/20 text-bumeran-400 border border-bumeran-500/30 text-xs font-semibold transition-all self-start md:self-auto shrink-0"
            >
              <span>Configurar Credenciales Fudo</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Metric Cards of Test Data */}
      {counts ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-semibold">Comensales</span>
              <Users className="w-4 h-4 text-bumeran-400" />
            </div>
            <div className="text-xl font-black text-white">{counts.customers}</div>
            <p className="text-[10px] text-gray-400 mt-0.5">Base en pruebas</p>
          </div>

          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-semibold">Ventas / Tickets</span>
              <Receipt className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white">{counts.sales}</div>
            <p className="text-[10px] text-gray-400 mt-0.5">Tickets procesados</p>
          </div>

          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-semibold">Lotes FIFO</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-black text-white">{counts.pointsBatches}</div>
            <p className="text-[10px] text-gray-400 mt-0.5">Lotes de caducidad</p>
          </div>

          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-semibold">Puntos Emitidos</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-300">{counts.activePoints.toLocaleString()}</div>
            <p className="text-[10px] text-gray-400 mt-0.5">Saldo acumulado</p>
          </div>

          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 shadow-sm">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-semibold">Bitácora / Crons</span>
              <History className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl font-black text-white">{counts.pointsHistory + counts.cronLogs}</div>
            <p className="text-[10px] text-gray-400 mt-0.5">Registros históricos</p>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-400 text-xs">Cargando estado...</div>
      )}

      {/* Success Notification after Purge */}
      {purgeResult && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 animate-in fade-in">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-300">
                ¡Purga completada con éxito! La base de datos está limpia.
              </h4>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Se eliminaron <strong>{purgeResult.deleted.customers}</strong> comensales,{" "}
                <strong>{purgeResult.deleted.sales}</strong> ventas y{" "}
                <strong>{purgeResult.deleted.pointsBatches}</strong> lotes de puntos. Tus usuarios
                administradores ({purgeResult.preserved.adminUsers}), catálogo de premios ({purgeResult.preserved.rewards}) y
                configuraciones han sido preservados íntegramente.
              </p>
              {purgeResult.fudoSyncReset && (
                <div className="text-[11px] text-emerald-300/80 pt-1">
                  ✓ El punto de sincronización de Fudo fue reiniciado a cero para una importación completa y limpia.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Two Column Layout: Preservation Guarantees & Danger Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: What is PRESERVED */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Garantías de Preservación de Datos</span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            El reseteo está diseñado como un <em>filtro quirúrgico</em>. Solo elimina la actividad operativa
            transaccional generada durante los ensayos con el cliente.
          </p>

          <div className="space-y-2.5">
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-dark-950/60 border border-dark-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Usuarios Administradores & PINs</div>
                <div className="text-[11px] text-gray-400">
                  Tu acceso al Backoffice y la Caja POS no se alterará ({counts?.preservedData.adminUsers || 1} usuario activo).
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-dark-950/60 border border-dark-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Catálogo de Premios & Beneficios</div>
                <div className="text-[11px] text-gray-400">
                  Los premios creados para el restaurante se conservan ({counts?.preservedData.rewards || 0} recompensas).
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-dark-950/60 border border-dark-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Reglas y Parámetros Globales</div>
                <div className="text-[11px] text-gray-400">
                  Tasa de conversión de puntos, caducidad dual (90d / 365d) y reglas antifraude configuradas.
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-dark-950/60 border border-dark-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Credenciales API & Plantillas CSV</div>
                <div className="text-[11px] text-gray-400">
                  Tu API Key y Secret de Fudo, así como presets guardados de Maxirest o Tango, quedan listos para operar.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Danger Zone / Action */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-rose-500/20 space-y-4">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Zona de Reseteo (Entorno de Prueba)</span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Elimina todos los clientes, ventas y puntos acumulados en esta base de datos para preparar el
            lanzamiento oficial con clientes reales.
          </p>

          <form onSubmit={handleExecuteReset} className="space-y-4 pt-1">
            <div className="space-y-2 p-3.5 rounded-xl bg-dark-950/80 border border-dark-800 text-xs">
              <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetFudoSync}
                  onChange={(e) => setResetFudoSync(e.target.checked)}
                  className="rounded border-dark-700 text-bumeran-500 focus:ring-0"
                />
                <span>Resetear última fecha de sincronización de Fudo (forzar sync total al lanzar)</span>
              </label>

              <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetCronLogs}
                  onChange={(e) => setResetCronLogs(e.target.checked)}
                  className="rounded border-dark-700 text-bumeran-500 focus:ring-0"
                />
                <span>Limpiar bitácora de ejecuciones de crons anteriores</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300">
                Para confirmar, escribe <span className="font-bold text-rose-400">BORRAR</span> en el campo:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Escribe BORRAR aquí"
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-750 focus:border-rose-500 rounded-xl text-white text-xs font-mono tracking-wider focus:outline-none placeholder:text-gray-600 uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={!isConfirmValid || isPurging || (!hasDataToWipe && !confirmText)}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md ${
                isConfirmValid && !isPurging
                  ? "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-rose-950/50"
                  : "bg-dark-800 text-gray-500 cursor-not-allowed border border-dark-750"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isPurging
                  ? "Purgando datos de prueba..."
                  : !hasDataToWipe
                  ? "Base de datos limpia (0 registros de prueba)"
                  : "Limpiar y Resetear Base de Datos"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
