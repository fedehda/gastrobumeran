# GastroBumeran 🍔🔁
### *Plataforma Inteligente de Fidelización Gastronómica & POS*
> **Arquitectura Unificada:** Opera como **Cloud Multi-Tenant SaaS** o como **Servidor Local Offline** en la PC del comercio.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3%20%2F%20v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite Native](https://img.shields.io/badge/SQLite-node:sqlite-003b57?logo=sqlite)](https://nodejs.org/)
[![PostgreSQL Ready](https://img.shields.io/badge/PostgreSQL-14%2B%20Ready-336791?logo=postgresql)](https://www.postgresql.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Mobile%20Terminal%20%26%20QR-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

---

## 🚀 Presentación del Proyecto & Portfolio

**GastroBumeran** es una solución tecnológica integral de fidelización, retención y business intelligence diseñada específicamente para la industria gastronómica (restaurantes, bares, cafeterías, cervecerías y cadenas multi-sucursal). 

Resuelve el problema central del sector: **multiplicar la concurrencia y el ticket promedio de los comensales sin ceder margen de ganancia en descuentos ciegos**, blindando las finanzas del comercio con un **modelo dual anti-inflacionario** y desacoplando la operación de apps móviles pesadas mediante **tarjetas digitales PWA con códigos QR dinámicos**.

### 🌟 Arquitectura Unificada (Single Codebase): Cloud SaaS vs. Local Offline
El sistema está construido bajo un único repositorio y código fuente con **modo de ejecución configurable** mediante variables de entorno:

| Modalidad | Variable de Entorno | Caso de Uso | Experiencia de Acceso |
| :--- | :--- | :--- | :--- |
| **🌐 Cloud SaaS Multi-Tenant** *(Default)* | `APP_MODE=cloud` | Plataforma comercial SaaS escalable en la nube (Vercel, AWS, VPS). Soporta auto-registro de locales, onboarding guiado, landing institucional y portales de marca blanca (`/r/[slug]`). | Acceso a Landing Comercial en `/`, login en `/ingresar`, registro en `/registro` y backoffice en `/admin`. |
| **💻 Local Offline (PC de Negocio)** | `APP_MODE=offline` o `SINGLE_TENANT=true` | Instalación monousuario sobre la computadora física de caja del restaurante. Cero latencia, opera 100% desconectado de internet apuntando a SQLite embebido. | Acceso directo e instantáneo a la **Caja POS y Backoffice** en `/`, ocultando pantallas SaaS. |

---

## ⚡ Demo Rápida para Evaluación (1-Click Setup)

El repositorio incluye un script de siembra con datos de demostración realistas (comensales clasificados, transacciones, catálogo de premios y campañas activas):

```bash
# 1. Instalar dependencias
npm install

# 2. Poblar la base de datos de demostración para portfolio
npm run seed:demo

# 3. Iniciar la plataforma en modo desarrollo (escuchando en toda la red local)
npm run dev
# O en Windows hacer doble clic sobre: iniciar-gastrobumeran.bat
```

### 🔑 Credenciales Demo Preconfiguradas:
* **Administrador Central (Backoffice & POS):**
  * **Email:** `admin@gastrobumeran.com`
  * **Contraseña:** `admin123`
  * **PIN Táctil:** `1234`
* **Mozo / Operador de Salón (Terminal Móvil & Canjes):**
  * **Email:** `mozo@gastrobumeran.com`
  * **PIN Táctil / Físico:** `4321`

### 📱 Enlaces Principales:
* **Plataforma Principal:** [http://localhost:3000](http://localhost:3000)
* **Terminal Móvil PWA (con Escáner QR de Cámara):** [http://localhost:3000/terminal](http://localhost:3000/terminal)
* **Terminal de Caja con PIN:** [http://localhost:3000/r/demo/caja](http://localhost:3000/r/demo/caja)
* **Tarjeta Digital PWA del Comensal:** [http://localhost:3000/portal](http://localhost:3000/portal) o [http://localhost:3000/r/demo](http://localhost:3000/r/demo)
* **DNI Demo para probar la Tarjeta:** `38123456` (Valentina Rossi - Tier Oro) o `40123999` (Mariano Gourmet - Tier Bronce).

---

## 🛠️ Pilares Funcionales y Tecnológicos

### 1. 📱 Terminal Móvil PWA & Escáner QR de Cámara en Vivo
* **Escáner Integrado:** Componente [`QrCameraScanner`](src/components/terminal/QrCameraScanner.tsx) con soporte para cámara frontal/trasera, visor animado y control de linterna (torch).
* **Lectura Instantánea de Tarjeta:** Al escanear el QR del cliente, muestra su nombre, DNI, nivel/tier (Bronce, Plata, Oro), saldo de puntos acumulados, visitas y días antes de la caducidad.
* **Flujo de Canje Directo en 1 Clic:**
  1. El cliente entra a su tarjeta web y pulsa *"Canjear"* sobre un premio disponible (ej. *Café de Especialidad + Medialuna*).
  2. Su código QR se regenera codificando el premio solicitado (`GASTRO:REDEEM:<id>:DNI:<dni>`).
  3. El mozo o cajero escanea el QR desde su celular o terminal; el sistema identifica el producto exacto, valida saldo suficiente y despliega el botón **"Aceptar y Entregar Canje"**, debitando los puntos en un solo paso.
* **Soporte de Teclado Físico y Numpad:** La pantalla de PIN de terminal acepta ingreso tanto táctil como por teclado numérico físico de PC (`0-9`, `Backspace`, `Escape`, `Enter`).

### 2. 🍔 Motor Híbrido de Fidelización (Core Engine)
* **Eje Puntos (Volumen de Consumo):** Cada \$X consumidos acumula 1 punto canjeable en el catálogo gastronómico (configurable en tiempo real).
* **Eje Visitas (Frecuencia de Retorno):** Tickets superiores al umbral mínimo suman +1 visita computable con **regla antifraude de cooldown (18 horas)** para evitar el fraccionamiento deliberado de comandas en la misma mesa.
* **Exclusión de Personas Jurídicas (AFIP / ARCA):** Detección algorítmica estricta que excluye razones sociales y CUITs de empresas (prefijos `30`, `33`, etc.), garantizando que los beneficios premien a comensales humanos reales.

### 3. 🛡️ Modelo Dual Anti-Inflacionario con Consumo FIFO
* **Timer 1 (Inactividad - Rolling 90 días):** Si el comensal pasa 90 días sin asistir, sus puntos expiran. Cada nueva compra renueva la ventana por otros 90 días.
* **Timer 2 (Caducidad de Lote - FIFO 365 días):** Cada consumo genera un lote contable con vida útil máxima de 1 año.
* **Consumo FIFO (*First In, First Out*):** Al efectuar un canje, el sistema debita automáticamente los lotes más próximos a vencer, maximizando la vigencia para el cliente y protegiendo el costo de reposición del restaurante.
* **Alerta Preventiva Día 75:** Detección de clientes con puntos próximos a vencer con botón de 1 clic para reactivación por WhatsApp.

### 4. 🔥 Motor de Campañas Dinámicas & Días Valle
* **Aceleradores Temporales:** Multiplicadores automáticos de puntos (*x1.5*, *x2*, *x3*) y bonos de bienvenida para estimular el consumo en turnos de baja concurrencia.
* **Reglas Flexibles:** Segmentación por días de la semana, franja horaria (ej. Happy Hour 18:00 a 20:30 hs), sector de salón (Salón, Mostrador, Delivery) y ticket mínimo.
* **Feedback Reactivo en Pantalla de Caja:** Desglose en vivo de puntos base vs. puntos promocionales al ingresar el importe de venta.

### 5. 🎂 Cortesía Anual por Cumpleaños
* Detección automática en la semana de cumpleaños del cliente ($\pm 3$ días) desplegando una alerta destacada para invitar el postre de la casa, con protección estricta contra múltiples canjes por año calendario.

### 6. 📊 Tablero de Business Intelligence & RFM
* **Métricas en Tiempo Real:** Facturación fidelizada, tasa de retención de comensales, Burn Rate de puntos y cálculo de pasivo circulante.
* **Segmentación RFM Automática:** Clasificación en cuadrantes (*Champions*, *Prometedores*, *En Riesgo*, *Dormidos*) para exportación quirúrgica de campañas.
* **Gestor de Premios (CRUD):** Creación y edición interactiva de productos y hitos de visitas.

### 7. 🔌 Integraciones POS (Punto de Venta)
* **Conector Oficial Fudo API:** Sincronización continua de comandas cerradas y clientes con soporte para Sandbox oficial (`DEMO_`).
* **Importador Universal CSV:** Wizard de 3 pasos con auto-detección de delimitadores, normalización monetaria, mapeo de columnas y presets reutilizables (*Maxirest*, *Tango Restô*).
* **Módulo de Anulación & Rollback Atómico:** Reversión completa en base de datos de puntos, visitas y facturación ante comandas anuladas en el POS.

### 8. 🌐 Portal del Comensal PWA (Marca Blanca por Local)
* Tarjeta digital accesible por navegador móvil sin requerir descargas pesadas desde Play Store / App Store.
* Identidad visual dinámica con logo y paleta de colores del restaurante.
* Catálogo de premios en tiempo real con barras de progreso y código QR para presentar en caja.

---

## 🏗️ Arquitectura Técnica del Codebase

```
gastrobumeran/
├── data/                            # Base de datos SQLite embebida de alto rendimiento
├── src/
│   ├── app/                         # Next.js 16 App Router
│   │   ├── admin/                   # Backoffice gerencial y métricas de analítica
│   │   ├── api/                     # Endpoints REST y Webhooks protegidos
│   │   ├── ingresar/                # Acceso centralizado para dueños y operadores
│   │   ├── portal/                  # Tarjeta digital PWA del cliente
│   │   ├── r/[slug]/                # Portal de marca blanca por restaurante
│   │   │   ├── caja/                # Terminal de caja con PIN por local
│   │   ├── registro/                # Auto-onboarding de restaurantes (Modo Cloud)
│   │   ├── terminal/                # Terminal móvil con escáner QR de cámara
│   │   ├── layout.tsx               # Shell global con soporte Dark/Light Mode
│   │   └── page.tsx                 # Router unificado (POS en offline / Landing en cloud)
│   ├── components/
│   │   ├── analytics/               # Tableros BI y cuadrantes RFM
│   │   ├── campaigns/               # Modal y editor de campañas dinámicas
│   │   ├── csv/                     # Wizard interactivo del importador universal CSV
│   │   ├── fudo/                    # Modal de sincronización con Fudo POS API
│   │   ├── landing/                 # Landing comercial SaaS con comparativa de planes
│   │   ├── portal/                  # Visualización de tarjeta digital y QR de canje
│   │   ├── terminal/                # Escáner de cámara, tarjeta rápida y catálogo móvil
│   │   ├── CustomerSearch.tsx       # Buscador predictivo con navegación por flechas
│   │   ├── Navbar.tsx               # Barra superior con insignia de modo y accesos
│   │   └── SaleForm.tsx             # Carga rápida de ventas con presets y campañas
│   ├── lib/
│   │   ├── auth/                    # requireSession() middleware y verificación JWT
│   │   ├── config/                  # Módulo de modo unificado (app-mode.ts)
│   │   ├── db/                      # Repositorios SQL tenant-aware y SQLite nativo
│   │   ├── loyalty/                 # Motor híbrido de puntos, visitas y lotes FIFO
│   │   ├── pos/                     # Pasarela agnóstica de sistemas POS
│   │   └── validation/              # Detección algorítmica de CUITs y personas físicas
│   ├── scripts/                     # Automatizaciones, seeds de demo y suites de tests
│   └── types/                       # Definiciones TypeScript de dominio gastronómico
├── iniciar-gastrobumeran.bat        # Lanzador para Windows con detección de IP Wi-Fi
├── schema.sql                       # DDL formal PostgreSQL 14+ / Supabase
└── package.json
```

---

## ⚙️ Configuración y Variables de Entorno

Crear un archivo `.env.local` en la raíz copiando el modelo de [`.env.example`](.env.example):

```env
# ------------------------------------------------------------------------------
# 0. MODO DE EJECUCIÓN (UNIFIED CODEBASE)
# ------------------------------------------------------------------------------
# APP_MODE=cloud     -> Modo Multi-Tenant Cloud SaaS (Landing en '/', registro en '/registro')
# APP_MODE=offline   -> Modo Monousuario Local (POS directo en '/', SQLite local)
APP_MODE=cloud
SINGLE_TENANT=false

# (Opcional en modo offline) Local asignado:
LOCAL_RESTAURANT_ID=resto-demo-default
LOCAL_RESTAURANT_SLUG=demo

# ------------------------------------------------------------------------------
# 1. INTEGRACIÓN POS (FUDO API)
# ------------------------------------------------------------------------------
FUDO_API_KEY=DEMO_FUDO_KEY_RESTO99
FUDO_API_SECRET=DEMO_FUDO_SECRET_XYZ888
FUDO_BASE_URL=https://api.fu.do/v1alpha1
FUDO_AUTH_URL=https://auth.fu.do/api

# ------------------------------------------------------------------------------
# 2. SEGURIDAD & CRONS
# ------------------------------------------------------------------------------
CRON_SECRET=gastrobumeran_secret_cron_key_2026
AUTH_SECRET=gastrobumeran_jwt_secret_loyalty_2026
```

---

## 🧪 Pruebas Automatizadas y Calidad

El proyecto incluye suites completas de pruebas unitarias y de integración ejecutables con Node.js y `tsx`:

```bash
# Probar arquitectura unificada y detección de modo Offline vs Cloud
npx tsx src/scripts/test-app-mode.ts

# Probar aislamiento estricto Multi-Tenant (Sprint K a P)
npx tsx src/scripts/test-multitenancy.ts

# Probar Terminal Móvil PWA, escáner y resolución de QR de canjes
npx tsx src/scripts/test-mobile-terminal.ts

# Probar motor de campañas dinámicas y franjas horarias
npx tsx src/scripts/test-campaigns.ts

# Probar exclusión algorítmica de CUITs corporativos
npx tsx src/scripts/test-cuit-exclusion.ts

# Comprobación estricta de tipos de TypeScript
npx tsc --noEmit
```

---

## 🗺️ Roadmap de Evolución y Sprints

* [x] **Sprint 1 & 2:** Motor híbrido, doble timer anti-inflación y wizard CSV universal.
* [x] **Sprint 3:** Integración bidireccional con Fudo POS API y simulador sandbox.
* [x] **Sprint 4:** Tablero gerencial de Business Intelligence, churn y crons nocturnos.
* [x] **Sprint 5:** Autenticación por PIN táctil / contraseña y gestor CRUD de premios.
* [x] **Sprint Futuro F:** Motor de campañas dinámicas en días valle (Happy Hour, bonos).
* [x] **Sprint Futuro K:** Arquitectura Multi-Tenant core, particionamiento de datos y DDL PostgreSQL.
* [x] **Sprint Futuro L:** RBAC por local (`OWNER`, `ADMIN`, `CASHIER`), sesiones JWT seguras y PIN por restaurante.
* [x] **Sprint Futuro M:** Auto-registro de restaurantes (`/registro`), verificación de email y modo `TRIAL_DEMO`.
* [x] **Sprint Futuro N:** Credenciales POS cifradas con AES-256-GCM y scheduler multi-tenant.
* [x] **Sprint Futuro O:** Portal del cliente independiente por restaurante (`/r/[slug]`) y validación OTP.
* [x] **Sprint Futuro P:** Landing page comercial (`/`), tabla comparativa de suscripciones y captación de leads.
* [x] **Sprint Terminal Móvil:** PWA móvil con escáner QR por cámara en vivo y flujo de canje en 1 clic.
* [x] **Unificación de Codebase:** Arquitectura de código único con conmutación dinámica Offline/Cloud.
* [ ] **Sprint Futuro Q:** Consola de Super-Administrador de plataforma (`/plataforma`) e impersonación de locales para soporte técnico.

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia MIT. Diseñado con altos estándares de ingeniería de software para despliegues comerciales y entornos gastronómicos de alta concurrencia.
