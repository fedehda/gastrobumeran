"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Server,
  Users,
  Coins,
  Receipt,
  Sparkles,
  Info,
} from "lucide-react";
import { FudoConfig, FudoSyncResult } from "@/types/loyalty";

interface FudoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted?: () => void;
}

export function FudoModal({ isOpen, onClose, onSyncCompleted }: FudoModalProps) {
  const [config, setConfig] = useState<FudoConfig | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.fu.do/v1alpha1");
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(60);
  const [showSecret, setShowSecret] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fullSync, setFullSync] = useState(false);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    isSandbox?: boolean;
    tokenPreview?: string;
    expiresAt?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const [syncResult, setSyncResult] = useState<FudoSyncResult | null>(null);
  const [syncCustomers, setSyncCustomers] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/fudo/config");
        if (res.ok) {
          const data: FudoConfig = await res.json();
          setConfig(data);
          setApiKey(data.api_key || "");
          setApiSecret(data.api_secret || "");
          setBaseUrl(data.base_url || "https://api.fu.do/v1alpha1");
          setAutoSync(Boolean(data.auto_sync_enabled));
          setSyncInterval(data.sync_interval_minutes || 60);
        }
      } catch (err) {
        console.error("Error al cargar config de Fudo:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoadDemoCredentials = () => {
    setApiKey("DEMO_FUDO_KEY_RESTO99");
    setApiSecret("DEMO_FUDO_SECRET_XYZ888");
    setBaseUrl("https://api.fu.do/v1alpha1");
    setTestResult(null);
    setMsg({
      type: "success",
      text: "Credenciales de Sandbox Fudo cargadas. Haz clic en 'Probar Conexión' o 'Guardar'.",
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setMsg(null);

    try {
      const res = await fetch("/api/fudo/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          base_url: baseUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTestResult({
          success: false,
          error: data.error || "No se pudo conectar con Fudo API",
        });
      } else {
        setTestResult({
          success: true,
          isSandbox: data.isSandbox,
          tokenPreview: data.tokenPreview,
          expiresAt: data.expiresAt,
          message: data.message,
        });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Error de red al conectar",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/fudo/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          base_url: baseUrl,
          auto_sync_enabled: autoSync,
          sync_interval_minutes: syncInterval,
        }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || "Error al guardar configuración");
      }

      setConfig(updated);
      setMsg({ type: "success", text: "Configuración de Fudo guardada correctamente." });
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Error al guardar" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setMsg(null);

    try {
      const res = await fetch("/api/fudo/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSync, syncCustomers }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error durante la sincronización");
      }

      setSyncResult(data.result);
      if (onSyncCompleted) {
        onSyncCompleted();
      }
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Error al ejecutar sincronización",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const isDemo = apiKey.toUpperCase().startsWith("DEMO_") || !apiKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 bg-dark-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Integración API Fudo POS
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  RF-01 Ingesta
                </span>
                {isDemo && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Modo Sandbox
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Sincronización automatizada de ventas cerradas y comensales en tiempo real
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

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-sm text-gray-400">Cargando credenciales y estado de Fudo...</p>
            </div>
          ) : (
            <>
              {/* Alert message */}
              {msg && (
                <div
                  className={`p-4 rounded-xl border flex items-center space-x-3 ${
                    msg.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}
                >
                  {msg.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  )}
                  <span className="text-sm font-medium">{msg.text}</span>
                </div>
              )}

              {/* Grid 2 Columns: Credentials & Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Column 1: Config Form (7 cols) */}
                <div className="lg:col-span-7 bg-dark-950/50 border border-dark-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-dark-800">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                      <Key className="w-4 h-4 text-sky-400" />
                      <span>Credenciales API Fudo</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadDemoCredentials}
                      className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Cargar Demo Sandbox</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveConfig} className="space-y-4">
                    {/* API Key */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        API Key (Pública / Restaurante)
                      </label>
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Ej: DEMO_FUDO_KEY_RESTO99"
                        className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* API Secret */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        API Secret
                      </label>
                      <div className="relative">
                        <input
                          type={showSecret ? "text" : "password"}
                          value={apiSecret}
                          onChange={(e) => setApiSecret(e.target.value)}
                          placeholder="Ej: DEMO_FUDO_SECRET_XYZ888"
                          className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Base URL */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-gray-300">
                          Base URL de la API REST Fudo
                        </label>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Auth: https://auth.fu.do/api
                        </span>
                      </div>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.fu.do/v1alpha1"
                        className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-sky-500 font-mono text-xs"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Endpoint oficial de datos: <code className="text-gray-400">https://api.fu.do/v1alpha1</code>. La autenticación se realiza de forma automática contra <code className="text-gray-400">https://auth.fu.do/api</code>.
                      </p>
                    </div>

                    {/* Sync interval & Auto Sync */}
                    <div className="pt-2 border-t border-dark-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="autoSync"
                          checked={autoSync}
                          onChange={(e) => setAutoSync(e.target.checked)}
                          className="w-4 h-4 rounded bg-dark-900 border-dark-700 text-sky-500 focus:ring-sky-500"
                        />
                        <label htmlFor="autoSync" className="text-xs font-medium text-gray-300 cursor-pointer">
                          Sincronización Periódica
                        </label>
                      </div>

                      <div>
                        <select
                          value={syncInterval}
                          onChange={(e) => setSyncInterval(Number(e.target.value))}
                          disabled={!autoSync}
                          className="w-full px-2.5 py-1.5 bg-dark-900 border border-dark-700 rounded-lg text-xs text-white disabled:opacity-50"
                        >
                          <option value={2}>Cada 2 minutos (Pruebas / En vivo)</option>
                          <option value={5}>Cada 5 minutos (Recomendado)</option>
                          <option value={15}>Cada 15 minutos</option>
                          <option value={30}>Cada 30 minutos</option>
                          <option value={60}>Cada 1 hora</option>
                          <option value={120}>Cada 2 horas</option>
                        </select>
                      </div>
                    </div>
                    {autoSync && (
                      <p className="text-[11px] text-emerald-400/90 pt-1 flex items-center space-x-1.5">
                        <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Daemon activo: GastroBumeran actualizará comensales y ventas en segundo plano cada {syncInterval} minutos.</span>
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center space-x-3 pt-3">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-xs font-semibold text-white transition-all disabled:opacity-50"
                      >
                        {isTesting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Server className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        <span>{isTesting ? "Verificando..." : "Probar Conexión"}</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition-all disabled:opacity-50 shadow-glow"
                      >
                        {isSaving ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        <span>{isSaving ? "Guardando..." : "Guardar Credenciales"}</span>
                      </button>
                    </div>
                  </form>

                  {/* Test Result Feedback */}
                  {testResult && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        testResult.success
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-red-500/10 border-red-500/30 text-red-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold">
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span>{testResult.success ? "Autenticación Exitosa (HTTP 200)" : "Fallo de Autenticación"}</span>
                      </div>
                      <p className="text-gray-300">{testResult.message || testResult.error}</p>
                      {testResult.tokenPreview && (
                        <div className="font-mono text-[11px] text-gray-400 bg-dark-900/80 p-2 rounded border border-dark-800 mt-1">
                          Token Bearer: {testResult.tokenPreview} (Válido 24hs)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Column 2: Trigger Sync & Ingestion Engine (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-dark-950/50 border border-dark-800 rounded-xl p-5 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-white pb-2 border-b border-dark-800">
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      <span>Ingesta & Sincronización</span>
                    </div>

                    <div className="text-xs text-gray-400 space-y-2">
                      <p>
                        Ejecuta la extracción de ventas con estado <code className="text-amber-300">CLOSED</code> desde Fudo,
                        resolviendo clientes, acreditando puntos y sellos de visita.
                      </p>
                      <div className="p-3 rounded-lg bg-dark-900 border border-dark-800 space-y-1">
                        <div className="flex justify-between text-gray-400">
                          <span>Última sincronización:</span>
                          <span className="text-white font-medium">
                            {config?.last_sync_at
                              ? new Date(config.last_sync_at).toLocaleString("es-AR")
                              : "Nunca"}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Idempotencia:</span>
                          <span className="text-emerald-400 font-medium">Activa (fudo_sale_id)</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="syncCustomers"
                          checked={syncCustomers}
                          onChange={(e) => setSyncCustomers(e.target.checked)}
                          className="w-4 h-4 rounded bg-dark-900 border-dark-700 text-sky-500 focus:ring-sky-500"
                        />
                        <label htmlFor="syncCustomers" className="text-xs text-gray-300 cursor-pointer">
                          Sincronizar directorio de clientes de Fudo
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="fullSync"
                          checked={fullSync}
                          onChange={(e) => setFullSync(e.target.checked)}
                          className="w-4 h-4 rounded bg-dark-900 border-dark-700 text-sky-500 focus:ring-sky-500"
                        />
                        <label htmlFor="fullSync" className="text-xs text-gray-300 cursor-pointer">
                          Sincronización completa de ventas (ignorar fecha previa)
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleTriggerSync}
                      disabled={isSyncing}
                      className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-bold text-sm shadow-glow transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                      <span>{isSyncing ? "Sincronizando con Fudo..." : "Sincronizar Ventas Ahora"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sync Execution Results Panel */}
              {syncResult && (
                <div className="bg-dark-950 border border-emerald-500/30 rounded-xl p-5 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-dark-800">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Resultado de Ingesta Fudo API</span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">
                      {new Date(syncResult.lastSyncAt).toLocaleTimeString("es-AR")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-center">
                      <div className="flex items-center justify-center text-sky-400 mb-1">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-bold text-white">{syncResult.syncedCount}</div>
                      <div className="text-[11px] text-gray-400">Ventas Ingeridas</div>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-center">
                      <div className="flex items-center justify-center text-emerald-400 mb-1">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-bold text-white">{syncResult.newCustomersCount}</div>
                      <div className="text-[11px] text-gray-400">Comensales Fudo</div>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-center">
                      <div className="flex items-center justify-center text-amber-400 mb-1">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-bold text-amber-400">+{syncResult.totalPointsEarned}</div>
                      <div className="text-[11px] text-gray-400">Puntos Emitidos</div>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-center">
                      <div className="flex items-center justify-center text-purple-400 mb-1">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-bold text-gray-300">{syncResult.duplicatedCount}</div>
                      <div className="text-[11px] text-gray-400">Duplicadas (Omitidas)</div>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-center">
                      <div className="flex items-center justify-center text-amber-400 mb-1">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-bold text-amber-300">{syncResult.unassignedCount || 0}</div>
                      <div className="text-[11px] text-gray-400">Sin Cliente Fudo</div>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-center col-span-2 sm:col-span-1">
                      <div className="flex items-center justify-center text-emerald-400 mb-1">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="text-base font-bold text-emerald-400">
                        ${syncResult.totalAmountProcessed.toLocaleString("es-AR")}
                      </div>
                      <div className="text-[11px] text-gray-400">Facturación Total</div>
                    </div>
                  </div>

                  {syncResult.unassignedCount > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-start space-x-2">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Atención ({syncResult.unassignedCount} venta(s) sin cliente):</strong> En Fudo, para que una venta cerrada sume puntos en GastroBumeran, el cajero o mozo debe tener asignado un cliente en la comanda/ticket de Fudo (o haber registrado su teléfono/DNI). Las ventas anónimas o a consumidor final no acumulan puntos.
                      </span>
                    </div>
                  )}

                  {syncResult.errors.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 space-y-1">
                      <div className="font-semibold">Advertencias / Excepciones detectadas:</div>
                      {syncResult.errors.map((e, idx) => (
                        <div key={idx}>• {e}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-xs text-gray-400 bg-dark-900 p-2.5 rounded-lg border border-dark-800">
                    <Info className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>
                      Los puntos acreditados han generado nuevos lotes FIFO con caducidad a 365 días y reiniciado el Timer 1 (inactividad) a 90 días para cada comensal.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
