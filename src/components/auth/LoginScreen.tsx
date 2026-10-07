"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Utensils, KeyRound, Mail, ShieldCheck, Eye, EyeOff, Sparkles, AlertCircle, ArrowRight, Keyboard, Lock } from "lucide-react";
import { AdminUser } from "@/types/loyalty";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LoginScreenProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [authMode, setAuthMode] = useState<"pin" | "password">("pin");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("admin@gastrobumeran.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const isLoadingRef = useRef(isLoading);
  const lockoutSecondsRef = useRef(lockoutSeconds);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  useEffect(() => {
    lockoutSecondsRef.current = lockoutSeconds;
  }, [lockoutSeconds]);

  // Countdown timer for security lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const triggerKeyFeedback = (key: string) => {
    setActiveKey(key);
    setTimeout(() => {
      setActiveKey((curr) => (curr === key ? null : curr));
    }, 110);
  };

  const submitLogin = useCallback(
    async (credentials: { email?: string; password?: string; pin?: string }) => {
      if (lockoutSecondsRef.current > 0) return;
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          if (data.retryAfterSeconds && typeof data.retryAfterSeconds === "number") {
            setLockoutSeconds(data.retryAfterSeconds);
          }
          throw new Error(data.error || "Credenciales inválidas");
        }

        setLockoutSeconds(0);
        onLoginSuccess(data.user);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error al iniciar sesión");
        setPin("");
      } finally {
        setIsLoading(false);
      }
    },
    [onLoginSuccess]
  );

  const handlePinDigit = useCallback(
    (digit: string) => {
      if (isLoadingRef.current || lockoutSecondsRef.current > 0) return;
      setErrorMsg(null);
      triggerKeyFeedback(digit);
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          // Auto-submit on 4 digits
          submitLogin({ pin: next });
        }
        return next;
      });
    },
    [submitLogin]
  );

  const handlePinDelete = useCallback(() => {
    if (isLoadingRef.current || lockoutSecondsRef.current > 0) return;
    triggerKeyFeedback("⌫");
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handlePinClear = useCallback(() => {
    if (isLoadingRef.current || lockoutSecondsRef.current > 0) return;
    triggerKeyFeedback("C");
    setPin("");
  }, []);

  // Keyboard listener for physical keyboard & numpad input
  useEffect(() => {
    if (authMode !== "pin") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea") {
        return;
      }

      if (isLoadingRef.current) return;

      // Digits 0-9 (top row or numpad)
      let digit: string | null = null;
      if (/^[0-9]$/.test(e.key)) {
        digit = e.key;
      } else if (e.code && /^Numpad[0-9]$/.test(e.code)) {
        digit = e.code.replace("Numpad", "");
      }

      if (digit !== null) {
        e.preventDefault();
        handlePinDigit(digit);
        return;
      }

      // Backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        handlePinDelete();
        return;
      }

      // Clear (Delete, Escape or 'c' / 'C')
      if (e.key === "Delete" || e.key === "Escape" || e.key.toLowerCase() === "c") {
        e.preventDefault();
        handlePinClear();
        return;
      }

      // Enter
      if (e.key === "Enter") {
        e.preventDefault();
        setPin((current) => {
          if (current.length === 4) {
            submitLogin({ pin: current });
          }
          return current;
        });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [authMode, handlePinDigit, handlePinDelete, handlePinClear, submitLogin]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Por favor ingresa tu email y contraseña.");
      return;
    }
    submitLogin({ email, password });
  };

  const handleQuickDemoLogin = () => {
    submitLogin({ pin: "1234" });
  };

  const formatLockoutTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-dark-950 text-slate-800 dark:text-gray-100 relative overflow-hidden select-none">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-bumeran-600/5 dark:bg-bumeran-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white dark:bg-dark-900/90 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-xl dark:shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-bumeran-600 to-amber-500 flex items-center justify-center shadow-glow">
            <Utensils className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Gastro<span className="text-bumeran-500">Bumeran</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Plataforma de Fidelización Gastronómica</p>
          </div>
          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-xs text-slate-700 dark:text-gray-300">
            <ShieldCheck className="w-3.5 h-3.5 text-bumeran-600 dark:text-bumeran-400" />
            <span>Acceso Seguro de Administrador</span>
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-dark-950 border border-slate-200 dark:border-dark-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode("pin");
              if (lockoutSeconds <= 0) setErrorMsg(null);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              authMode === "pin"
                ? "bg-bumeran-600 text-white shadow-glow"
                : "text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN Rápido</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              if (lockoutSeconds <= 0) setErrorMsg(null);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              authMode === "password"
                ? "bg-bumeran-600 text-white shadow-glow"
                : "text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email / Password</span>
          </button>
        </div>

        {/* Lockout banner or error message */}
        {lockoutSeconds > 0 ? (
          <div role="alert" className="p-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-300 text-xs flex flex-col items-center justify-center space-y-2 text-center animate-in fade-in duration-300">
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">Acceso Bloqueado por Seguridad</div>
              <p className="text-slate-600 dark:text-gray-300 text-xs mt-0.5">
                Demasiados intentos fallidos consecutivos. Podrás volver a intentar en:
              </p>
            </div>
            <div className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-dark-950 font-mono text-base font-black text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30">
              {formatLockoutTime(lockoutSeconds)}
            </div>
          </div>
        ) : errorMsg && (
          <div role="status" aria-live="polite" className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode 1: PIN Screen */}
        {authMode === "pin" && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-gray-400">Ingresa tu PIN de seguridad (4 dígitos)</p>
              {/* Masked circles display with accessible status */}
              <div
                role="status"
                aria-live="polite"
                aria-label={`PIN ingresado: ${pin.length} de 4 dígitos`}
                className="flex justify-center items-center space-x-3 py-2"
              >
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      pin.length > idx
                        ? "bg-bumeran-500 scale-125 shadow-glow"
                        : "bg-slate-200 border border-slate-300 dark:bg-dark-800 dark:border-dark-700"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((btn) => {
                const isFeedbackActive = activeKey === btn;
                const isSpecial = btn === "C" || btn === "⌫";
                const ariaLabel =
                  btn === "C"
                    ? "Limpiar PIN completo"
                    : btn === "⌫"
                    ? "Borrar último dígito"
                    : `Dígito ${btn}`;

                return (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => {
                      if (btn === "C") handlePinClear();
                      else if (btn === "⌫") handlePinDelete();
                      else handlePinDigit(btn);
                    }}
                    disabled={isLoading || lockoutSeconds > 0}
                    aria-label={ariaLabel}
                    className={`h-14 rounded-2xl text-lg font-bold transition-all duration-100 flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSpecial
                        ? isFeedbackActive
                          ? "bg-slate-200 dark:bg-dark-700 text-slate-900 dark:text-white border border-slate-300 dark:border-dark-600 scale-[0.98]"
                          : "bg-slate-100/80 hover:bg-slate-200 dark:bg-dark-800/80 dark:hover:bg-dark-750 text-slate-600 dark:text-gray-400 text-sm font-semibold border border-slate-200 dark:border-transparent"
                        : isFeedbackActive
                        ? "bg-slate-200 dark:bg-dark-700 text-bumeran-600 dark:text-bumeran-400 border border-bumeran-500/40 scale-[0.98]"
                        : "bg-slate-50 hover:bg-slate-100 dark:bg-dark-800 dark:hover:bg-dark-750 text-slate-900 dark:text-white border border-slate-200 dark:border-dark-700/60 shadow-sm"
                    }`}
                  >
                    {btn}
                  </button>
                );
              })}
            </div>

            {/* Keyboard Hint */}
            <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 dark:text-gray-500 pt-1">
              <Keyboard className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400" />
              <span>Puedes usar los números de tu teclado físico o numpad</span>
            </div>
          </div>
        )}

        {/* Mode 2: Email & Password Form */}
        {authMode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={lockoutSeconds > 0}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gastrobumeran.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-bumeran-500 disabled:opacity-50"
                />
                <Mail className="absolute right-3 top-3 w-4 h-4 text-slate-400 dark:text-gray-500" />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">
                Contraseña de Administrador
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  disabled={lockoutSeconds > 0}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-bumeran-500 pr-10 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || lockoutSeconds > 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-bumeran-600 to-amber-600 hover:from-bumeran-500 hover:to-amber-500 text-white font-bold text-sm shadow-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? "Validando..." : "Ingresar como Administrador"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Demo Fast Access Button */}
        <div className="pt-2 border-t border-slate-200 dark:border-dark-800 text-center">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isLoading || lockoutSeconds > 0}
            className="w-full inline-flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ingreso Rápido Demo (PIN: 1234)</span>
          </button>
          <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-2">
            Credenciales de prueba: <code className="text-slate-700 dark:text-gray-400">admin@gastrobumeran.com</code> / <code className="text-slate-700 dark:text-gray-400">admin123</code> (o PIN <code className="text-amber-600 dark:text-amber-400">1234</code>)
          </p>
        </div>
      </div>
    </div>
  );
}
