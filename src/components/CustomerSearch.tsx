"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, UserPlus, Phone, Award, Calendar, Check, X } from "lucide-react";
import { Customer } from "@/types/loyalty";

interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewCustomerModal: (prefilledDoc?: string) => void;
  selectedCustomerId?: string | null;
}

export function CustomerSearch({
  onSelectCustomer,
  onOpenNewCustomerModal,
  selectedCustomerId,
}: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  // Search debounced
  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/customers?query=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();
        if (data.success) {
          setResults(data.customers);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Error searching customers:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (c: Customer) => {
    onSelectCustomer(c);
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-5 h-5 text-bumeran-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Buscar por DNI, Teléfono o Nombre (ej. 30123456)..."
          className="w-full pl-11 pr-24 py-3.5 bg-dark-900/90 border border-dark-750 focus:border-bumeran-500/80 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bumeran-500/20 text-sm transition-all shadow-inner"
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center space-x-1.5">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-800"
              title="Borrar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenNewCustomerModal(query)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-bumeran-500/10 hover:bg-bumeran-500/20 text-bumeran-400 border border-bumeran-500/30 rounded-lg text-xs font-semibold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Nuevo</span>
          </button>
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-dark-900 border border-dark-750 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-400 flex items-center justify-center space-x-2">
              <span className="w-4 h-4 border-2 border-bumeran-500 border-t-transparent rounded-full animate-spin"></span>
              <span>Buscando comensales...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-dark-800">
              <div className="px-3 py-1.5 bg-dark-950/60 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Comensales Encontrados ({results.length})
              </div>
              {results.map((c) => {
                const isSelected = c.id === selectedCustomerId;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-dark-800/80 transition-colors group ${
                      isSelected ? "bg-bumeran-500/10 border-l-2 border-bumeran-500" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-bumeran-400 font-bold text-sm group-hover:border-bumeran-500/40">
                        {c.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white text-sm group-hover:text-bumeran-400 transition-colors">
                            {c.name}
                          </span>
                          {c.loyalty_enrolled === 0 || c.loyalty_enrolled === false ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              No Adherido
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Fidelizado
                            </span>
                          )}
                          {isSelected && (
                            <span className="flex items-center text-[10px] text-emerald-400 font-medium">
                              <Check className="w-3 h-3 mr-0.5" /> Seleccionado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-400 mt-0.5">
                          <span>DNI: <strong className="text-gray-200">{c.document_number}</strong></span>
                          {c.phone && (
                            <span className="flex items-center text-gray-400">
                              <Phone className="w-3 h-3 mr-1 text-gray-500" /> {c.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-right">
                      {c.loyalty_enrolled === 0 || c.loyalty_enrolled === false ? (
                        <div className="bg-gray-800/80 border border-gray-700/80 px-2.5 py-1 rounded-lg">
                          <div className="text-xs font-semibold text-gray-400 flex items-center justify-end">
                            0 pts
                          </div>
                          <div className="text-[10px] text-amber-400/80 flex items-center justify-end">
                            Click para afiliar
                          </div>
                        </div>
                      ) : (
                        <div className="bg-bumeran-500/10 border border-bumeran-500/20 px-2.5 py-1 rounded-lg">
                          <div className="text-xs font-bold text-bumeran-400 flex items-center justify-end">
                            <Award className="w-3 h-3 mr-1" />
                            {c.points_balance} pts
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center justify-end">
                            <Calendar className="w-2.5 h-2.5 mr-1" />
                            {c.visit_count} visitas
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-center">
              <p className="text-sm text-gray-300 font-medium">No se encontró comensal con &quot;{query}&quot;</p>
              <p className="text-xs text-gray-500 mt-1">Puedes registrarlo en 2 clics para acreditar sus puntos de hoy.</p>
              <button
                onClick={() => {
                  onOpenNewCustomerModal(query);
                  setIsOpen(false);
                }}
                className="mt-3 inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-glow"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Alta Rápida de Cliente &quot;{query}&quot;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
