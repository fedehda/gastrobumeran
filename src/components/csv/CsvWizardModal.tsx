"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Sparkles,
  Table,
  Check,
  RotateCcw,
  Users,
  DollarSign,
  Copy,
} from "lucide-react";
import { CsvMappingPreset } from "@/types/loyalty";
import { CsvFieldMapping, CsvBatchProcessSummary } from "@/lib/csv/parser";

interface CsvWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const SAMPLE_MAXIREST = `DNI_CUIT;Cliente_Nombre;Total_Comprobante;Fecha_Emision;Telefono;Nro_Ticket
30.123.456;Juan Pérez;$ 5.400,00;28/09/2026 21:30;+5491144445555;MAXI-9101
28.987.654;María Fernández;12.500,50;28/09/2026 22:15;+5491166667777;MAXI-9102
40.555.666;Rodrigo Benítez;$ 4.200,00;28/09/2026 20:00;+5491133334444;MAXI-9103
33.777.888;Diego Morales;18.900,00;28/09/2026 23:00;+5491155556666;MAXI-9104
22.444.111;Estela Domínguez;$ 3.150,00;28/09/2026 19:45;+5491177778888;MAXI-9105`;

const SAMPLE_TANGO = `NroDoc,RazonSocial,ImpTotal,Fecha,Celular,IdFactura
30123456,Juan Pérez,3500.00,2026-09-28,+5491144445555,TANGO-401
35444333,Carlos Rodríguez,8900.50,2026-09-28,+5491122223333,TANGO-402
99112233,Camila Romero,14200.00,2026-09-28,+5491199990000,TANGO-403`;

export function CsvWizardModal({ isOpen, onClose, onImportComplete }: CsvWizardModalProps) {
  // Step state: 1 = Upload, 2 = Mapping & Preview, 3 = Processing & Summary
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // CSV content and preview
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [delimiter, setDelimiter] = useState(";");

  // Presets
  const [presets, setPresets] = useState<CsvMappingPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [newPresetName, setNewPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetSavedSuccess, setPresetSavedSuccess] = useState(false);

  // Mapping state
  const [mapping, setMapping] = useState<CsvFieldMapping>({
    document_number: "",
    name: "",
    total_amount: "",
    sale_date: "",
    phone: "",
    external_sale_id: "",
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processSummary, setProcessSummary] = useState<CsvBatchProcessSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load presets on mount
  useEffect(() => {
    if (isOpen) {
      fetch("/api/csv/presets")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setPresets(data.presets);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle file drop / select
  const handleFileChange = async (file: File) => {
    setFileName(file.name);
    setErrorMsg(null);
    try {
      const text = await file.text();
      setCsvContent(text);
      await loadPreview(text);
    } catch {
      setErrorMsg("Error al leer el archivo seleccionado.");
    }
  };

  const loadSample = async (sampleText: string, name: string) => {
    setFileName(name);
    setCsvContent(sampleText);
    setErrorMsg(null);
    await loadPreview(sampleText);
  };

  const loadPreview = async (content: string) => {
    try {
      const res = await fetch("/api/csv/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al inspeccionar el archivo CSV");
      }

      setHeaders(data.data.headers);
      setPreviewRows(data.data.previewRows);
      setTotalRows(data.data.totalRows);
      setDelimiter(data.data.delimiter);

      // Auto-match headers if they match common field names
      const autoMap: CsvFieldMapping = {
        document_number: "",
        name: "",
        total_amount: "",
        sale_date: "",
        phone: "",
        external_sale_id: "",
      };

      for (const h of data.data.headers) {
        const lower = h.toLowerCase();
        if (/dni|cuit|doc|ident|nro_fiscal|nrodoc/i.test(lower) && !autoMap.document_number) autoMap.document_number = h;
        if (/nombre|cliente|razon|name/i.test(lower) && !autoMap.name) autoMap.name = h;
        if (/total|monto|importe|comprobante|imptotal/i.test(lower) && !autoMap.total_amount) autoMap.total_amount = h;
        if (/fecha|date|emision/i.test(lower) && !autoMap.sale_date) autoMap.sale_date = h;
        if (/tel|cel|phone|whatsapp/i.test(lower) && !autoMap.phone) autoMap.phone = h;
        if (/ticket|factura|sale_id|external|comprobante_id/i.test(lower) && !autoMap.external_sale_id) autoMap.external_sale_id = h;
      }

      setMapping(autoMap);
      setStep(2);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al previsualizar CSV");
    }
  };

  const handleApplyPreset = (presetIdStr: string) => {
    setSelectedPresetId(presetIdStr);
    const p = presets.find((x) => x.id.toString() === presetIdStr);
    if (!p) return;

    const conf = p.mapping_config as Record<string, string>;
    setMapping({
      document_number: conf.document_number || "",
      name: conf.name || "",
      total_amount: conf.total_amount || "",
      sale_date: conf.sale_date || "",
      phone: conf.phone || "",
      external_sale_id: conf.external_sale_id || "",
    });
    if (p.delimiter) {
      setDelimiter(p.delimiter);
    }
  };

  const handleSaveAsPreset = async () => {
    if (!newPresetName.trim()) return;
    setIsSavingPreset(true);
    setPresetSavedSuccess(false);

    try {
      const res = await fetch("/api/csv/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_name: newPresetName.trim(),
          mapping_config: mapping,
          delimiter,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar preset");
      }

      setPresets((prev) => [...prev.filter((p) => p.system_name !== data.preset.system_name), data.preset]);
      setSelectedPresetId(data.preset.id.toString());
      setPresetSavedSuccess(true);
      setNewPresetName("");
      setTimeout(() => setPresetSavedSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar preset");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!mapping.document_number || !mapping.name || !mapping.total_amount) {
      setErrorMsg("DNI, Nombre y Monto Total son campos obligatorios para mapear.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    const selectedPresetObj = presets.find((p) => p.id.toString() === selectedPresetId);
    const presetName = selectedPresetObj?.system_name || "Mapeo Manual";

    try {
      const res = await fetch("/api/csv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent,
          mapping,
          delimiter,
          presetName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error en el procesamiento del lote");
      }

      setProcessSummary(data.summary);
      setStep(3);
      onImportComplete();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error durante la importación");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setCsvContent("");
    setFileName("");
    setHeaders([]);
    setPreviewRows([]);
    setTotalRows(0);
    setProcessSummary(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="max-w-4xl w-full rounded-2xl bg-dark-900 border border-dark-750 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
        {/* Wizard Header */}
        <div className="p-5 border-b border-dark-800 flex items-center justify-between shrink-0 bg-dark-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-glow">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">Importador Universal de CSV</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  RF-02 Wizard
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Maxirest, Tango Restô, Excel, Fudo y software POS externo
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Step Pills */}
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold">
              <span className={`px-2.5 py-1 rounded-lg ${step === 1 ? "bg-emerald-500 text-white" : "bg-dark-800 text-gray-400"}`}>
                1. Archivo
              </span>
              <span className="text-dark-700">→</span>
              <span className={`px-2.5 py-1 rounded-lg ${step === 2 ? "bg-emerald-500 text-white" : "bg-dark-800 text-gray-400"}`}>
                2. Mapeo & 5 Filas
              </span>
              <span className="text-dark-700">→</span>
              <span className={`px-2.5 py-1 rounded-lg ${step === 3 ? "bg-emerald-500 text-white" : "bg-dark-800 text-gray-400"}`}>
                3. Resultado
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wizard Body (Scrollable) */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD & DEMO SAMPLES */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-dark-700 hover:border-emerald-500/60 rounded-2xl p-8 text-center bg-dark-950/40 hover:bg-dark-950/80 transition-all flex flex-col items-center justify-center space-y-3 cursor-pointer group"
                onClick={() => document.getElementById("csvFileInput")?.click()}
              >
                <input
                  id="csvFileInput"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors shadow-glow">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Haz clic o arrastra tu archivo .CSV aquí</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Detección automática de delimitador (coma, punto y coma, tabulador) y formatos numéricos
                  </p>
                </div>
              </div>

              {/* Instant Demo Presets Buttons */}
              <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-gray-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>¿No tienes un CSV a mano? Prueba con ejemplos reales en 1 clic:</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => loadSample(SAMPLE_MAXIREST, "ventas_maxirest_ejemplo.csv")}
                    className="px-3.5 py-2 rounded-xl bg-dark-900 hover:bg-dark-850 border border-dark-750 hover:border-emerald-500/40 text-xs font-semibold text-gray-200 transition-all flex items-center space-x-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Cargar Ejemplo Maxirest (Delimitador ; y formato $ 5.400,00)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSample(SAMPLE_TANGO, "ventas_tango_ejemplo.csv")}
                    className="px-3.5 py-2 rounded-xl bg-dark-900 hover:bg-dark-850 border border-dark-750 hover:border-emerald-500/40 text-xs font-semibold text-gray-200 transition-all flex items-center space-x-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>Cargar Ejemplo Tango Restô (Delimitador , y formato 3500.00)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & 5-ROW PREVIEW */}
          {step === 2 && (
            <div className="space-y-5">
              {/* File Info & Preset Selector Bar */}
              <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-white text-sm">{fileName || "Archivo CSV"}</span>
                  <div className="text-gray-400 mt-0.5">
                    {totalRows} filas detectadas • Delimitador: <code className="text-emerald-400 bg-dark-900 px-1 py-0.5 rounded">&quot;{delimiter}&quot;</code>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-gray-400 shrink-0 font-medium">Aplicar Preset Guardado:</label>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleApplyPreset(e.target.value)}
                    className="px-3 py-1.5 bg-dark-900 border border-dark-750 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Seleccionar Preset...</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.system_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Column Mapping Selectors Grid */}
              <div className="p-4 rounded-xl bg-dark-950/80 border border-dark-750 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <Table className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Emparejamiento de Columnas (Mapeo de Campos)</span>
                  </h4>
                  <span className="text-[11px] text-gray-500">* Campos obligatorios para procesar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* DNI */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      DNI / CUIT / Nro. Fiscal *
                    </label>
                    <select
                      value={mapping.document_number}
                      onChange={(e) => setMapping({ ...mapping, document_number: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-900 border border-dark-700 focus:border-emerald-500 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Nombre del Cliente *
                    </label>
                    <select
                      value={mapping.name}
                      onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-900 border border-dark-700 focus:border-emerald-500 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Importe Total */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Importe Total de Venta *
                    </label>
                    <select
                      value={mapping.total_amount}
                      onChange={(e) => setMapping({ ...mapping, total_amount: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-900 border border-dark-700 focus:border-emerald-500 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Fecha / Hora de Venta (Opcional)
                    </label>
                    <select
                      value={mapping.sale_date}
                      onChange={(e) => setMapping({ ...mapping, sale_date: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-900 border border-dark-700 focus:border-emerald-500 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="">(Usar fecha y hora actual)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Teléfono / WhatsApp (Opcional)
                    </label>
                    <select
                      value={mapping.phone}
                      onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-900 border border-dark-700 focus:border-emerald-500 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="">-- No incluir --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ID Ticket Externo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      ID Ticket Externo (Idempotencia)
                    </label>
                    <select
                      value={mapping.external_sale_id}
                      onChange={(e) => setMapping({ ...mapping, external_sale_id: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-900 border border-dark-700 focus:border-emerald-500 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="">-- Sin ID externo --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Save Mapping as Preset */}
                <div className="pt-3 border-t border-dark-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <Bookmark className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-300 font-medium">¿Guardar configuración como nuevo Preset?</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Ej. Maxirest Sucursal Centro"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="px-3 py-1.5 bg-dark-900 border border-dark-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={isSavingPreset || !newPresetName.trim()}
                      onClick={handleSaveAsPreset}
                      className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {isSavingPreset ? "Guardando..." : "Guardar Preset"}
                    </button>
                    {presetSavedSuccess && (
                      <span className="text-emerald-400 text-xs flex items-center font-medium">
                        <Check className="w-3.5 h-3.5 mr-0.5" /> Guardado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5-Row Preview Table */}
              <div className="rounded-xl border border-dark-750 overflow-hidden bg-dark-950">
                <div className="p-3 bg-dark-900 border-b border-dark-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-300">
                    Previsualización de las primeras {previewRows.length} filas del archivo:
                  </span>
                  <span className="text-gray-500">Normalización de moneda y DNI automática</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-dark-900/80 text-gray-400 uppercase text-[10px] tracking-wider border-b border-dark-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        {headers.map((h) => {
                          const isMapped = Object.values(mapping).includes(h);
                          return (
                            <th
                              key={h}
                              className={`py-2.5 px-3 whitespace-nowrap ${
                                isMapped ? "text-emerald-400 font-bold bg-emerald-500/10" : ""
                              }`}
                            >
                              {h}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800/80 text-gray-200">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-dark-900/40">
                          <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                          {headers.map((h) => {
                            const isMapped = Object.values(mapping).includes(h);
                            return (
                              <td
                                key={h}
                                className={`py-2.5 px-3 whitespace-nowrap ${
                                  isMapped ? "bg-emerald-500/5 font-medium" : "text-gray-400"
                                }`}
                              >
                                {row[h] || "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUMMARY & DETAILS */}
          {step === 3 && processSummary && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Top Result Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-dark-950 to-dark-950 border border-emerald-500/40 flex items-center justify-between shadow-glow">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">¡Lote Procesado con Éxito!</h4>
                    <p className="text-xs text-gray-400">
                      Los puntos y visitas fueron acreditados en el Motor de Fidelización
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-extrabold text-emerald-400">
                    +{processSummary.totalPointsEarned.toLocaleString("es-AR")} pts
                  </div>
                  <div className="text-xs text-gray-400">Emitidos a comensales</div>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
                  <div className="text-xs text-gray-400 flex items-center mb-1">
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Ventas Exitosas
                  </div>
                  <div className="text-xl font-bold text-white">
                    {processSummary.successCount}
                    <span className="text-xs text-gray-500 font-normal ml-1">/ {processSummary.totalRows}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
                  <div className="text-xs text-gray-400 flex items-center mb-1">
                    <Users className="w-3.5 h-3.5 mr-1 text-blue-400" /> Clientes Nuevos
                  </div>
                  <div className="text-xl font-bold text-blue-400">
                    +{processSummary.newCustomersCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
                  <div className="text-xs text-gray-400 flex items-center mb-1">
                    <Copy className="w-3.5 h-3.5 mr-1 text-amber-400" /> Duplicadas (Idemp.)
                  </div>
                  <div className="text-xl font-bold text-amber-400">
                    {processSummary.duplicatedCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
                  <div className="text-xs text-gray-400 flex items-center mb-1">
                    <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Facturación
                  </div>
                  <div className="text-xl font-bold text-white">
                    ${processSummary.totalAmountProcessed.toLocaleString("es-AR")}
                  </div>
                </div>
              </div>

              {/* Row-by-Row Execution Log */}
              <div className="rounded-xl border border-dark-750 overflow-hidden bg-dark-950">
                <div className="p-3 bg-dark-900 border-b border-dark-800 text-xs font-bold text-gray-300">
                  Detalle de Filas Procesadas ({processSummary.results.length}):
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-dark-900/80 text-gray-400 uppercase text-[10px] tracking-wider border-b border-dark-800 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Fila</th>
                        <th className="py-2 px-3">Estado</th>
                        <th className="py-2 px-3">Cliente / DNI</th>
                        <th className="py-2 px-3">Monto</th>
                        <th className="py-2 px-3">Puntos</th>
                        <th className="py-2 px-3">Ticket ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800/80 text-gray-200">
                      {processSummary.results.map((r, i) => (
                        <tr key={i} className="hover:bg-dark-900/40">
                          <td className="py-2 px-3 text-gray-500">{r.rowNumber}</td>
                          <td className="py-2 px-3">
                            {r.success ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                ✓ Procesada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold" title={r.error}>
                                ✕ Error: {r.error}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-white">{r.customerName}</span>
                            <span className="text-gray-400 text-[11px] ml-1.5">({r.documentNumber})</span>
                          </td>
                          <td className="py-2 px-3">
                            {r.totalAmount ? `$${r.totalAmount.toLocaleString("es-AR")}` : "-"}
                          </td>
                          <td className="py-2 px-3 font-bold text-emerald-400">
                            {r.pointsEarned !== undefined ? `+${r.pointsEarned} pts` : "-"}
                          </td>
                          <td className="py-2 px-3 text-gray-400">
                            {r.externalSaleId || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-4 border-t border-dark-800 bg-dark-950/80 flex items-center justify-between shrink-0">
          <div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 text-xs font-semibold transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Archivo</span>
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={resetWizard}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 text-xs font-semibold transition-colors flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Importar Otro Archivo</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
            >
              {step === 3 ? "Finalizar" : "Cancelar"}
            </button>

            {step === 2 && (
              <button
                type="button"
                disabled={isProcessing || !mapping.document_number || !mapping.name || !mapping.total_amount}
                onClick={handleExecuteImport}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-glow flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Procesando Lote en Motor...</span>
                  </>
                ) : (
                  <>
                    <span>Procesar {totalRows} Ventas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
