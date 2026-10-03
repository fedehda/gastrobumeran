"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { MetricsBar } from "@/components/MetricsBar";
import { CustomerSearch } from "@/components/CustomerSearch";
import { CustomerCard } from "@/components/CustomerCard";
import { SaleForm } from "@/components/SaleForm";
import { RewardsList } from "@/components/RewardsList";
import { CustomerHistory } from "@/components/CustomerHistory";
import { NewCustomerModal } from "@/components/NewCustomerModal";
import { SettingsModal } from "@/components/SettingsModal";
import { ExpirationAuditModal } from "@/components/ExpirationAuditModal";
import { CsvWizardModal } from "@/components/csv/CsvWizardModal";
import { FudoModal } from "@/components/fudo/FudoModal";
import { VoidSaleModal } from "@/components/sales/VoidSaleModal";
import { BackofficeDashboard } from "@/components/analytics/BackofficeDashboard";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { Customer, LoyaltySettings, LoyaltyReward, PointsHistory, Sale, BirthdayStatus, AdminUser } from "@/types/loyalty";
import { Award, Users, ShieldCheck, CheckCircle, Sparkles } from "lucide-react";

interface CustomerDetailState {
  customer: Customer;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
  oldestBatchDaysLeft: number | null;
  birthdayStatus: BirthdayStatus;
  pointsHistory: PointsHistory[];
  sales: Sale[];
  eligibleRewards: Array<LoyaltyReward & { isEligible: boolean; progress: number }>;
}

export default function PosPage() {
  const [metrics, setMetrics] = useState({
    total_customers: 0,
    total_points: 0,
    total_revenue: 0,
    today_sales_count: 0,
    today_sales_amount: 0,
    today_points_issued: 0,
    today_redemptions_count: 0,
  });

  const [settings, setSettings] = useState<LoyaltySettings>({
    id: 1,
    points_earning_rate: 100,
    points_expiration_days: 90,
    points_lifetime_days: 365,
    min_spend_for_visit: 1500,
    visit_cooldown_hours: 18,
    allow_visit_table: true,
    allow_visit_counter: false,
    allow_visit_delivery: false,
    updated_at: new Date().toISOString(),
  });

  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [customerTab, setCustomerTab] = useState<"active" | "unenrolled" | "all">("active");
  const [customerDetail, setCustomerDetail] = useState<CustomerDetailState | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // View Mode: POS vs Backoffice Analytics
  const [viewMode, setViewMode] = useState<"pos" | "analytics">("pos");

  // Modals state
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerInitialQuery, setNewCustomerInitialQuery] = useState("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isCsvWizardOpen, setIsCsvWizardOpen] = useState(false);
  const [isFudoModalOpen, setIsFudoModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  // Toast / feedback alert
  const [toast, setToast] = useState<{ type: "success" | "info"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Check authentication session on mount
  useEffect(() => {
    let ignore = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          }
          setIsCheckingAuth(false);
        }
      })
      .catch(() => {
        if (!ignore) setIsCheckingAuth(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
    setCurrentUser(null);
    showToast("Sesión cerrada correctamente", "info");
  };

  // Load metrics & settings (manual refresh also triggers proactive Fudo sync)
  const refreshData = useCallback(async (options?: { syncFudo?: boolean; showFeedback?: boolean }) => {
    setIsRefreshing(true);
    let fudoNotice = "";

    try {
      // 1. If syncFudo is not disabled, trigger live sync with Fudo POS
      if (options?.syncFudo !== false) {
        try {
          const syncRes = await fetch("/api/fudo/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullSync: false, syncCustomers: true }),
          });

          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.success && syncData.result) {
              const { syncedCount, newCustomersCount, canceledCount } = syncData.result;
              const notices: string[] = [];
              if (syncedCount > 0) notices.push(`+${syncedCount} ventas`);
              if (newCustomersCount > 0) notices.push(`+${newCustomersCount} clientes`);
              if (canceledCount && canceledCount > 0) notices.push(`-${canceledCount} anuladas`);
              if (notices.length > 0) {
                fudoNotice = ` • Fudo: ${notices.join(", ")}`;
              }
            }
          }
        } catch (fudoErr) {
          console.warn("Aviso: Sincronización Fudo no completada durante el refresco:", fudoErr);
        }
      }

      // 2. Fetch fresh local metrics, settings, and customers
      const [resMetrics, resSettings, resCustomers] = await Promise.all([
        fetch("/api/pos/metrics").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
        fetch(`/api/customers?limit=9&filter=${customerTab}`).then((r) => r.json()),
      ]);

      if (resMetrics.success) setMetrics(resMetrics.metrics);
      if (resSettings.success) setSettings(resSettings.settings);
      if (resCustomers.success) setRecentCustomers(resCustomers.customers);

      if (options?.showFeedback) {
        showToast(`Datos actualizados correctamente${fudoNotice}`, "success");
      }
    } catch (err) {
      console.error("Error loading POS data:", err);
      if (options?.showFeedback) {
        showToast("Error al actualizar datos", "info");
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [customerTab]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const [resMetrics, resSettings, resCustomers] = await Promise.all([
          fetch("/api/pos/metrics").then((r) => r.json()),
          fetch("/api/settings").then((r) => r.json()),
          fetch(`/api/customers?limit=9&filter=active`).then((r) => r.json()),
        ]);

        if (!isMounted) return;
        if (resMetrics.success) setMetrics(resMetrics.metrics);
        if (resSettings.success) setSettings(resSettings.settings);
        if (resCustomers.success) setRecentCustomers(resCustomers.customers);
      } catch (err) {
        console.error("Error in initial POS load:", err);
      }
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update customers when tab changes
  useEffect(() => {
    fetch(`/api/customers?limit=9&filter=${customerTab}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setRecentCustomers(data.customers);
        }
      })
      .catch((err) => console.error("Error loading tab customers:", err));
  }, [customerTab]);

  // Auto-refresh when background auto-sync detects new sales or customers
  useEffect(() => {
    const handleSyncEvent = () => {
      refreshData();
    };
    window.addEventListener("gastrobumeran:sync-completed", handleSyncEvent);
    return () => {
      window.removeEventListener("gastrobumeran:sync-completed", handleSyncEvent);
    };
  }, [refreshData]);

  // Load detailed customer by ID
  const selectCustomer = async (c: Customer) => {
    setIsLoadingCustomer(true);
    try {
      const res = await fetch(`/api/customers/${c.id}`);
      const data = await res.json();
      if (data.success) {
        setCustomerDetail({
          customer: data.customer,
          daysUntilExpiration: data.daysUntilExpiration,
          isExpiringSoon: data.isExpiringSoon,
          oldestBatchDaysLeft: data.oldestBatchDaysLeft,
          birthdayStatus: data.birthdayStatus,
          pointsHistory: data.pointsHistory,
          sales: data.sales,
          eligibleRewards: data.eligibleRewards,
        });
      }
    } catch (err) {
      console.error("Error loading customer detail:", err);
    } finally {
      setIsLoadingCustomer(false);
    }
  };

  // Callback on successful manual sale
  const handleSaleSuccess = (
    updatedCustomer: Customer,
    pointsEarned: number,
    visitAdded: boolean,
    message: string
  ) => {
    showToast(message, "success");
    selectCustomer(updatedCustomer);
    refreshData();
  };

  // Callback on successful reward redemption
  const handleRedeemSuccess = (
    updatedCustomer: Customer,
    reward: LoyaltyReward,
    message: string
  ) => {
    showToast(message, "success");
    selectCustomer(updatedCustomer);
    refreshData();
  };

  // Callback on birthday courtesy dessert claim
  const handleRedeemBirthday = async () => {
    if (!customerDetail) return;
    try {
      const res = await fetch("/api/rewards/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customerDetail.customer.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al canjear cortesía");
      }
      showToast(data.message, "success");
      selectCustomer(data.data.customer);
      refreshData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error al canjear cortesía", "info");
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center space-y-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-bumeran-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs">Verificando sesión segura...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`¡Bienvenido, ${user.name}!`, "success");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-950 text-gray-100">
      {/* Navigation Bar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onOpenCsvWizard={() => setIsCsvWizardOpen(true)}
        onOpenFudo={() => setIsFudoModalOpen(true)}
        onOpenVoidSale={() => setIsVoidModalOpen(true)}
        onRefreshMetrics={() => refreshData({ syncFudo: true, showFeedback: true })}
        isRefreshing={isRefreshing}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-xs shadow-2xl flex items-center space-x-2 border border-emerald-400/30">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {viewMode === "analytics" ? (
          <BackofficeDashboard
            onOpenFudoModal={() => setIsFudoModalOpen(true)}
            onDataPurged={() => refreshData()}
          />
        ) : (
          <>
            {/* Top Daily Metrics Bar */}
            <MetricsBar metrics={metrics} />

        {/* Customer Search Row */}
        <div className="mb-6">
          <CustomerSearch
            onSelectCustomer={selectCustomer}
            onOpenNewCustomerModal={(query) => {
              setNewCustomerInitialQuery(query || "");
              setIsNewCustomerModalOpen(true);
            }}
            selectedCustomerId={customerDetail?.customer.id}
          />
        </div>

        {/* Selected Customer View vs Empty State */}
        {isLoadingCustomer ? (
          <div className="p-12 text-center rounded-2xl bg-dark-900/50 border border-dark-800 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-bumeran-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400">Cargando perfil y saldo de fidelización...</p>
          </div>
        ) : customerDetail ? (
          <div className="space-y-6">
            {/* Customer Profile Card with Birthday Banner & Dual Timers */}
            <CustomerCard
              customer={customerDetail.customer}
              daysUntilExpiration={customerDetail.daysUntilExpiration}
              isExpiringSoon={customerDetail.isExpiringSoon}
              oldestBatchDaysLeft={customerDetail.oldestBatchDaysLeft}
              birthdayStatus={customerDetail.birthdayStatus}
              onClearCustomer={() => setCustomerDetail(null)}
              onRedeemBirthday={handleRedeemBirthday}
              onCustomerUpdated={(updatedCustomer, message) => {
                showToast(message, "success");
                selectCustomer(updatedCustomer);
                refreshData();
              }}
            />

            {/* Split layout: Sale Form & History on Left, Rewards on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Sale Form + History */}
              <div className="lg:col-span-7 space-y-6">
                <SaleForm
                  customer={customerDetail.customer}
                  settings={settings}
                  onSaleSuccess={handleSaleSuccess}
                />
                <CustomerHistory
                  pointsHistory={customerDetail.pointsHistory}
                  sales={customerDetail.sales}
                  onSaleCanceled={(updatedCustomer, message) => {
                    showToast(message, "info");
                    selectCustomer(updatedCustomer);
                    refreshData();
                  }}
                />
              </div>

              {/* Right Column (5 cols): Rewards Catalog */}
              <div className="lg:col-span-5">
                <RewardsList
                  customer={customerDetail.customer}
                  rewards={customerDetail.eligibleRewards}
                  onRedeemSuccess={handleRedeemSuccess}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Empty State: Quick pick recent customers & system overview */
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-b from-dark-900/90 to-dark-950/80 border border-dark-800 p-8 text-center relative overflow-hidden shadow-card">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-bumeran-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-bumeran-600 to-amber-500 flex items-center justify-center text-white shadow-glow mb-4">
                <Users className="w-7 h-7" />
              </div>

              <h2 className="text-xl font-bold text-white mb-2">
                Punto de Cobro & Caja de Fidelización
              </h2>
              <p className="text-sm text-gray-400 max-w-lg mx-auto mb-6">
                Ingresa el DNI, Teléfono o Nombre del comensal arriba para acumular puntos por consumo, sellar su visita o canjear recompensas del menú. También puedes importar lotes de ventas vía CSV desde la barra superior.
              </p>

              {/* Quick Comensales Frecuentes con Filtro por Pestañas */}
              <div className="max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Comensales en Sistema:
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex items-center p-1 rounded-xl bg-dark-950/80 border border-dark-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setCustomerTab("active")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        customerTab === "active"
                          ? "bg-bumeran-500 text-white shadow-glow"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Activos en Fidelidad
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerTab("unenrolled")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        customerTab === "unenrolled"
                          ? "bg-amber-500 text-white shadow-glow"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      No Adheridos (Fudo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerTab("all")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        customerTab === "all"
                          ? "bg-dark-800 text-white border border-dark-700"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Todos
                    </button>
                  </div>
                </div>

                {recentCustomers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {recentCustomers.map((c) => {
                      const isEnrolled = c.loyalty_enrolled !== 0 && c.loyalty_enrolled !== false;
                      return (
                        <button
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          className="p-3 rounded-xl bg-dark-900 hover:bg-dark-850 border border-dark-750 hover:border-bumeran-500/50 text-left transition-all group flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-white group-hover:text-bumeran-400 transition-colors">
                                {c.name}
                              </span>
                              {!isEnrolled && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  No Adherido
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              DNI: {c.document_number}
                            </div>
                          </div>
                          <div className="text-right">
                            {isEnrolled ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-bumeran-500/10 text-bumeran-400 text-[10px] font-bold">
                                {c.points_balance} pts
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 text-[10px] font-medium">
                                0 pts
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-dark-950/40 border border-dark-800 text-xs text-gray-500 text-center">
                    {customerTab === "unenrolled"
                      ? "No hay comensales pendientes de adhesión. Todos los comensales registrados están activos en el programa."
                      : customerTab === "active"
                      ? "Aún no hay comensales activos en fidelidad. Registra uno con el botón '+ Nuevo' o búscalo por DNI."
                      : "No se encontraron comensales registrados en el sistema."}
                  </div>
                )}
              </div>
            </div>

            {/* Explanatory cards of Hybrid Core Engine */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-800 backdrop-blur-sm">
                <div className="flex items-center space-x-2 text-bumeran-400 font-bold text-sm mb-2">
                  <Award className="w-4 h-4" />
                  <span>1. Eje Puntos (Gasto)</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Premia el volumen consumido: cada ${settings.points_earning_rate} otorga 1 punto acumulable para canjear por entradas, platos o bebidas.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-800 backdrop-blur-sm">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>2. Eje Visitas (Frecuencia)</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Premia el retorno al local: tickets mayores a ${settings.min_spend_for_visit} computan +1 visita (con regla antifraude cooldown de {settings.visit_cooldown_hours}hs).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-800 backdrop-blur-sm">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>3. Modelo Dual Anti-Inflación</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Timer 1 rolling de {settings.points_expiration_days}d + Timer 2 FIFO de {settings.points_lifetime_days}d. Cumpleaños con postre de cortesía de la casa.
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </main>

      {/* Modals */}
      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        initialQuery={newCustomerInitialQuery}
        onCustomerCreated={(newCust) => {
          const fudoBadge = newCust.fudo_customer_id ? ` (Sincronizado en Fudo ID: ${newCust.fudo_customer_id})` : "";
          showToast(`¡Comensal "${newCust.name}" registrado con éxito${fudoBadge}!`, "success");
          selectCustomer(newCust);
          refreshData();
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSettingsUpdated={(newSettings) => {
          setSettings(newSettings);
          showToast("Reglas de fidelización actualizadas", "info");
        }}
      />

      <ExpirationAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* CSV Universal Importer Wizard Modal */}
      <CsvWizardModal
        isOpen={isCsvWizardOpen}
        onClose={() => setIsCsvWizardOpen(false)}
        onImportComplete={() => {
          refreshData();
          showToast("¡Lote de ventas importado con éxito!", "success");
        }}
      />

      {/* Fudo POS API Integration Modal */}
      <FudoModal
        isOpen={isFudoModalOpen}
        onClose={() => setIsFudoModalOpen(false)}
        onSyncCompleted={() => {
          refreshData();
          showToast("¡Sincronización con API Fudo completada!", "success");
        }}
      />

      {/* Void Sale Modal */}
      <VoidSaleModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onSaleCanceled={(updatedCust, msg) => {
          if (msg) showToast(msg, "info");
          if (customerDetail && updatedCust && customerDetail.customer.id === updatedCust.id) {
            selectCustomer(updatedCust);
          }
          refreshData();
        }}
      />
    </div>
  );
}
