# GastroBumeran 🍔🔁
### *Plataforma Integral de Fidelización para el Sector Gastronómico*

GastroBumeran es una plataforma web full-stack diseñada para la retención y recurrencia de comensales en restaurantes, bares y cervecerías mediante un **motor híbrido (Puntos por Consumo + Sellos por Visita)**, **protección anti-inflacionaria de doble timer (Rolling 90d + FIFO 365d)**, **módulo de cortesía anual por cumpleaños** y un **Importador Universal de CSV con wizard de mapeo y presets reutilizables**.

---

## 🌟 Módulos Implementados (Sprints 1 y 2 + Anexo Técnico)

### 1. Importador Universal de CSV & Presets (Sprint 2 - RF-02)
- **Wizard Interactivo de 3 Pasos:**
  - **Paso 1: Carga y Detección Automática:** Soporte drag & drop o selección de archivos `.csv` con detección automática de delimitador (`,`, `;`, `\t`) y codificación. Incluye botones de carga rápida de archivos demo (*Maxirest* y *Tango Restô*).
  - **Paso 2: Previsualización de 5 Filas & Emparejamiento:** Tabla con las primeras 5 filas del archivo y selectores desplegables para mapear:
    - DNI / CUIT / Nro. Fiscal (obligatorio)
    - Nombre del Cliente (obligatorio)
    - Importe Total de la Venta (obligatorio)
    - Fecha / Hora (opcional)
    - Teléfono / WhatsApp (opcional)
    - ID de Venta Externa (opcional, para idempotencia)
  - **Gestor de Presets:** Carga y guardado en base de datos de plantillas de mapeo reutilizables (*Maxirest*, *Tango Restô*, sistemas personalizados).
  - **Normalizador Inteligente de Moneda y DNI:** Convierte sin errores formatos como `$ 1.500,50`, `1500,50`, `1,500.50`, `$ 15.000` y DNI con puntos/guiones (`30.123.456`).
  - **Paso 3: Procesamiento en Lotes & Métricas:**
    - Barra de progreso y reporte consolidado: ventas procesadas, puntos emitidos, nuevos comensales creados, duplicadas omitidas y errores detallados fila por fila.
    - Idempotencia estricta sobre `external_sale_id` (previene duplicar ventas o emitir puntos dobles si se re-importa el mismo archivo).

### 2. Motor Híbrido de Fidelización (Core Engine - RF-04)
- **Eje Puntos (Volumen de Gasto):** Acumula puntos según la tasa parametrizable en base de datos (por defecto: 1 punto cada $100 consumidos).
- **Eje Visitas (Frecuencia de Asistencia):** Suma +1 visita computable si el ticket supera el monto mínimo fijado (default: $1.500) con **regla antifraude de cooldown de 18 horas** para prevenir abuso por fraccionamiento de cuentas en la misma mesa.

### 3. Modelo Anti-Inflacionario: Sistema Dual de Caducidad con Consumo FIFO (RF-05 Revisado)
- **Timer 1 (Inactividad - Rolling Window a 90 días):** Si el comensal no registra consumos en 90 días corridos, su balance de puntos cae a 0. Cada nueva compra resetea esta cuenta regresiva a 90 días.
- **Timer 2 (Antigüedad de Lote - 365 días configurable):** Cada acreditación genera un lote en `points_batches` con caducidad a 365 días. Aunque el cliente asista periódicamente, los puntos acumulados hace más de un año vencen.
- **Algoritmo de Descuento FIFO (*First In, First Out*):** Al canjear recompensas en caja, se consumen siempre los lotes activos más antiguos, maximizando la vigencia de los puntos del comensal.
- **Depuración Automática Nocturna (Cron 03:00 AM):** Audita vencimientos de inactividad (+90d) y lotes expirados (+365d), asentando el débito en la bitácora de doble partida (`points_history`).
- **Alerta de Reactivación Día 75:** Detecta clientes con saldo activo que vencerán en los próximos 15 días con botón directo de contacto vía **WhatsApp**.

### 4. Módulo de Cortesía Anual: Cumpleaños con Postre de la Casa
- **Captura de Fecha Natalicia:** Campo `birth_date` opcional al registrar al comensal.
- **Alerta Automática en Pantalla de Caja:** Al buscar al cliente en su semana de cumpleaños ($\pm 3$ días o día exacto), se despliega un banner destacado:
  > 🎂 **¡Semana de Cumpleaños de [Nombre]!** Habilitado: *Postre de cortesía de la casa (Invitación)* `[ Botón: Canjear Cortesía ]`
- **Control Antifraude:** Columna `last_birthday_reward_year` en `customers` que impide canjear más de una cortesía por año calendario.
- **Auditoría:** Registro con `points = 0` y concepto *"Cortesía de cumpleaños: Postre de la casa (Año)"*.

### 5. Integración Automática vía API Pública de Fudo POS (Sprint 3 - RF-01)
- **Autenticación con Ciclo de Vida Bearer Token (24 hs):**
  - Conexión contra `https://api.fu.do/v1alpha1/auth` intercambiando `apiKey` y `apiSecret` provistos por el restaurante.
  - Renovación proactiva y almacenamiento en base de datos con margen de seguridad.
- **Sincronización Periódica & Bajo Demanda:**
  - Consulta del endpoint `/sales` filtrando únicamente ventas cerradas (`status=CLOSED`) a partir de la marca temporal `last_sync_at`.
  - Mapeo automático de tipos de venta: *Salón / Mesa*, *Mostrador / Takeaway* y *Delivery*.
- **Resolución y Alta Atómica de Comensales:**
  - Si la venta tiene cliente asignado (`customerId`), consulta `/customers/:id` para obtener identificación fiscal / DNI, teléfono y correo electrónico.
  - Vinculación inteligente y alta automática en el programa de fidelización si no existía previamente.
- **Idempotencia Transaccional Estricta:**
  - Registro de `fudo_sale_id` en `external_sale_id` con índice único en base de datos.
  - Previene en un 100% duplicar ventas o reemitir puntos ante múltiples ejecuciones o reintentos.
- **Simulador Sandbox / Modo Demostración:**
  - Al ingresar credenciales que inicien con `DEMO_` o al usar el botón rápido *"Cargar Demo Sandbox"*, el cliente activa el simulador oficial de Fudo POS generando ventas de salón y delivery para evaluar la ingesta sin necesidad de suscripción activa de pago.
- **Modal Interactivo "API Fudo" en UI:**
  - Botón de acceso directo en la barra superior.
  - Test de conexión en tiempo real con visor de token Bearer.
  - Interruptor de auto-sincronización periódica (15m, 30m, 60m, 120m).
  - Botón de sincronización manual con checkbox de sincronización completa y métricas consolidadas en vivo.

### 6. Tablero Analítico de Backoffice & Automatización de Crons (Sprint 4 - RF-05, RF-06)
- **Business Intelligence & KPIs en Tiempo Real:**
  - **Tasa de Retención (%):** Porcentaje de clientes recurrentes ($\ge 2$ visitas) sobre la base total.
  - **Facturación Fidelizada & Ticket Promedio:** Facturación acumulada filtrable por rangos temporales (*7 días*, *30 días*, *90 días*, *Histórico*).
  - **Tasa de Redención / Burn Rate:** Puntos canjeados vs emitidos para calibrar el atractivo del catálogo de recompensas.
  - **Pasivo Activo & Ahorro Anti-Inflacionario:** Monitoreo del volumen de puntos activos en circulación frente a los puntos depurados por inactividad (90d) y caducidad de lotes (365d), calculando el ahorro equivalente en pesos argentinos ($ ARS).
- **Desglose Visual de Canales de Ingesta:**
  - Métricas comparativas entre *Fudo API*, *Importador Universal CSV* y *Caja / Punto de Venta Manual*.
- **Pirámide de Frecuencia (Cohortes):**
  - Segmentación de comensales en *Nuevos (1 visita)*, *Ocasionales (2-4 visitas)*, *Habituales (5-9 visitas)* y *VIPs (10+ visitas)* con barras porcentuales nativas.
- **Top 10 Comensales Más Valiosos:**
  - Ranking comercial por volumen de gasto y frecuencia con badges VIP (Oro, Plata, Bronce).
- **Prevención de Churn & Alerta Día 75:**
  - Detección de clientes con saldo activo a vencer en los próximos 15 y 30 días.
  - Botón directo **"WhatsApp Fidelización"** con mensaje personalizado pre-cargado para incentivar su retorno antes de la caducidad.
- **Automatización de Tareas Programadas (Crons):**
  - Endpoint `/api/cron/expiration`: Auditoría nocturna (03:00 AM) de inactividad (+90d) y lotes (+365d), con protección de token `CRON_SECRET`.
  - Endpoint `/api/cron/fudo-sync`: Sincronización periódica automática según intervalo configurado en `fudo_config`.
  - Bitácora de ejecuciones `cron_logs` con registro de estados (`SUCCESS`, `WARNING`, `ERROR`), duración en milisegundos y resumen en tabla interactiva.
- **Switcher de Vistas en Barra de Navegación:**
  - Alternancia instantánea entre el modo operador **"Caja POS"** y el modo gerencial **"Métricas & Backoffice"**.

### 7. Módulo de Autenticación de Administrador & Gestor de Premios (Sprint 5)
- **Módulo de Login Seguro y Versátil:**
  - **Doble Modalidad de Acceso:**
    - **Teclado PIN Rápido (4 Dígitos):** Diseñado específicamente para pantallas táctiles y tablets de salón/caja POS, con indicador de círculos enmascarados, auto-envío automático al ingresar el 4to dígito y teclado numérico estilizado con micro-animaciones.
    - **Acceso Tradicional con Correo y Contraseña:** Formulario completo para administradores y dueños con visor de contraseña y enlace de ayuda.
    - **Botón "Acceso Rápido Demo":** Permite al evaluador iniciar sesión en un solo clic con las credenciales demo precargadas (`admin@gastrobumeran.com` / `admin123` o PIN `1234`).
  - **Seguridad Criptográfica:** Hash con PBKDF2 (100.000 iteraciones SHA-512 + Salt aleatorio único por usuario) tanto para contraseñas como para códigos PIN.
  - **Sesiones JWT Seguras:** Cookie HTTP-only `gastrobumeran_session` firmada criptográficamente con HMAC-SHA256 con expiración a 7 días.
  - **Protección de la Plataforma:** Acceso protegido integralmente; al iniciar sesión se desbloquea la Caja POS y el Backoffice, con badge del usuario activo (`name`, `role`) y botón de **"Cerrar Sesión"**.
- **Gestión Integral del Catálogo de Premios y Canjes (CRUD):**
  - **Sub-Tab en el Backoffice:** Pestaña dedicada *"Gestión de Premios & Canjes (CRUD)"* integrada armónicamente en el Tablero de Administrador.
  - **Operaciones Completas:**
    - **Alta de Nuevo Beneficio:** Modal interactivo con validaciones para definir Título, Descripción, Tipo de Recompensa (*Puntos por Consumo*, *Sellos de Visita* o *Ambos*), Costo en Puntos, Visitas Mínimas requeridas y Valor estimado en pesos ($ ARS) para cálculo de ROI.
    - **Edición en Tiempo Real:** Modificación ágil de valores, condiciones de canje y textos de cualquier premio existente.
    - **Interruptor de Estado (Activo / Pausado):** Permite pausar transitoriamente un premio por quiebre de stock o rotación estacional sin borrar su historial ni desconfigurar canjes pasados.
    - **Eliminación Segura:** Con confirmación modal y protección estricta del sistema que impide eliminar la cortesía especial de cumpleaños.
    - **Filtros Rápidos:** Vista por categorías: *Todos*, *Activos* y *Pausados*, con conteos en vivo.

### 8. Punto de Cobro & Caja Interactiva (POS)
- **Buscador en Tiempo Real:** Autocompletado instantáneo por DNI, Teléfono o Nombre con badge de puntos y visitas. Soporta lectura directa de prefijos QR (`GASTRO:DNI:...`).
- **Alta Rápida en 2 Clics:** Formulario express con DNI, Nombre, Teléfono y Fecha de Cumpleaños, con selección inmediata.
- **Carga Rápida de Ventas:** Chips con montos frecuentes ($1.500, $3.000, $5.000, $10.000, $20.000, $35.000), cálculo en tiempo real de puntos a otorgar, previsualización de visita/cooldown y ticket digital.
- **Catálogo de Recompensas:** Calificación visual según puntos y visitas, barras de progreso y modal de confirmación de entrega sincronizado con el catálogo administrado.
- **Scorecard del Comensal:** Indicadores en vivo de puntos activos, visitas computadas, doble temporizador (inactividad + lote más antiguo) y gasto histórico acumulado.
- **Bitácora de Historial:** Auditoría transaccional en doble partida (puntos positivos, canjes FIFO, cortesías de cumpleaños y ventas previas).
- **Acceso a Tarjeta Digital & WhatsApp:** Botones directos para abrir la tarjeta del cliente o compartírsela por WhatsApp con 1 clic.

### 9. Portal Web del Cliente PWA & Tarjeta Digital con QR Dinámico (Sprint Futuro A)
- **Acceso Web Móvil sin Fricción (Cero Descargas ni Logins Engorrosos):**
  - Acceso directo mediante enlace `/portal?dni=...` o ingresando DNI / Teléfono en pantalla.
  - Almacenamiento local persistente (`localStorage`) que recuerda la tarjeta del comensal en su teléfono para visitas futuras.
  - Soporte **PWA (Progressive Web App):** Con manifiesto web (`manifest.json`), íconos vectoriales de alta definición, meta tags táctiles y botón de instalación en pantalla de inicio.
- **Ficha Visual de Fidelización (Estilo Tarjeta VIP de Metal):**
  - **Identidad & Niveles (Tiers):** Categorización automática según visitas acumuladas (*Bronce*, *Plata*, *Oro*, *VIP Black*) con degradados dinámicos y sellos de frecuencia (5/10 sellos estilo pasaporte gastronómico).
  - **Saldo de Puntos en Vivo:** Visualización en tipografía dorada destacada con cálculo de equivalencia.
  - **Doble Temporizador Visible:** Muestra los días restantes de vigencia de inactividad (Timer 1: 90 días) y fecha del lote FIFO más antiguo por vencer (Timer 2: 365 días).
  - **Banner Natalicio:** Detección automática en la semana de cumpleaños informando el *Postre de la Casa de Cortesía* listo para disfrutar.
- **Código QR Dinámico de Alta Compatibilidad:**
  - Generación instantánea en pantalla con la biblioteca `qrcode` (error correction level H).
  - Modal a pantalla completa de alto contraste con fondo blanco nítido para escaneo rápido desde terminales POS o lectores 2D en penumbra.
  - Recordatorio interactivo de aumento de brillo para facilitar la lectura.
  - Botón de compartir nativo (**Web Share API**) o copiado rápido de enlace.
- **Catálogo de Recompensas con Barras de Progreso Interactivas:**
  - Muestra todos los premios activos creados por el administrador.
  - Barras porcentuales en tiempo real (ej. *75% completado - Faltan 25 puntos* o *¡Desbloqueado! Pedilo en caja*).
  - Pestañas de filtrado: *Todos*, *Desbloqueados* y *En Progreso*.
### 10. Inteligencia de Clientes RFM & Control de Pasivo Contable (Sprint Futuro H)
- **Clasificador Automático RFM (Recencia, Frecuencia, Monto):**
  - **4 Cuadrantes Estratégicos:**
    - **Champions (VIPs):** Recencia $\le 45$ días y Frecuencia $\ge 4$ visitas. Generan el mayor volumen de facturación. Estrategia: cuidado VIP, atención preferencial y degustaciones sorpresa sin desgastar con promociones de descuento.
    - **Prometedores:** Recencia $\le 45$ días con frecuencia en crecimiento (1-3 visitas). Estrategia: doble puntaje en próxima visita, gamificación y encuestas para convertirlos en Champions.
    - **En Riesgo (Rescate):** Clientes con historial relevante pero ausentes hace 45-90 días. En zona crítica de caducidad por Timer 1. Estrategia: alerta de Día 75 y propuestas atractivas antes de que expire su saldo.
    - **Dormidos (Inactivos):** Inactividad superior a 90 días o una sola visita lejana. Estrategia: reactivación agresiva (2x1, copa de bienvenida) o depuración de base.
  - **Recálculo Periódico y Bajo Demanda:** Endpoint `/api/cron/rfm` con registro estructurado en la bitácora `cron_logs`.
- **Control de Pasivo Contable Flotante (CMV Configurable):**
  - **Valor Facial vs Costo Real:** Monitoreo del saldo total de puntos circulantes valorizado a valor carta ($10 ARS/pt) frente al pasivo real en mercadería según Costo de Mercadería Vendida (CMV % configurable entre 25%, 30%, 32%, 35% y 40%, por defecto 32%).
  - **Ahorro Extinguido:** Cálculo del pasivo contable depurado y extinguido a costo $0 para el negocio gracias a los relojes del Doble Timer anti-inflación.
  - **Diagnóstico de Salud Financiera:** Mide el ratio de deuda en puntos sobre la facturación total con semáforo en vivo (*Saludable < 4%*, *Moderado 4-8%*, *Elevado > 8%*).
- **Segmentación Quirúrgica & Exportación de Campañas:**
  - **Filtros por Cuadrante y Búsqueda Dinámica:** Vista tabular completa con datos de recencia, visitas, gasto, puntos y estrategia recomendada.
  - **Exportación en CSV Compatible con Excel y Meta Ads:** Descarga de listados filtrados por cuadrante con codificación UTF-8 BOM (`\uFEFF`) y formato RFC-4180.
  - **Herramientas para WhatsApp:** Botón de un solo clic para copiar teléfonos filtrados al portapapeles y botones directos individuales de WhatsApp con mensaje personalizado pre-cargado por cuadrante.

---

## 🏗️ Arquitectura Técnica

- **Frontend & Backend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v3 + Lucide Icons + PapaParse + QRCode.
- **Base de Datos Productiva:** PostgreSQL 14+ ([`schema.sql`](schema.sql)) con soporte UUID, índices parciales y claves foráneas.
- **Base de Datos Local Inmediata:** SQLite embebido de alto rendimiento usando `node:sqlite` nativo de Node 24 (`data/gastrobumeran.sqlite`).

---

## 🚀 Inicio Rápido (Getting Started)

### 1. Requisitos
- Node.js 22.5+ o Node.js 24+
- npm 10+

### 2. Instalación y Ejecución
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Ejecutar pruebas del motor central (Doble Timer, FIFO, Antifraude y Cumpleaños)
npx tsx src/scripts/test-engine.ts

# Ejecutar pruebas del importador CSV (Normalización, detección de delimitador, presets e idempotencia)
npx tsx src/scripts/test-csv.ts

# Ejecutar pruebas de la integración con Fudo API (Auth 24h, ventas CLOSED, directorio clientes e idempotencia)
npx tsx src/scripts/test-fudo.ts

# Ejecutar pruebas del tablero analítico y bitácora de crons (KPIs, cohortes, canales y cron logs)
npx tsx src/scripts/test-analytics.ts

# Ejecutar pruebas de autenticación de admin y CRUD de premios (PIN, Password, JWT, CRUD y protecciones)
npx tsx src/scripts/test-sprint5.ts

# Ejecutar pruebas del portal del cliente (Lookup DNI, Tiers, Timers, Catálogo con Progreso y QR)
npx tsx src/scripts/test-portal.ts

# Ejecutar pruebas de Inteligencia RFM y Pasivo Contable CMV (Sprint H)
npx tsx src/scripts/test-rfm.ts
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para interactuar con la plataforma:
- **Punto de Venta & Backoffice:** `http://localhost:3000` (Credenciales Admin Demo: `admin@gastrobumeran.com` / `admin123` o PIN rápido `1234`).
- **Portal Web del Cliente (PWA):** `http://localhost:3000/portal` (o prueba con `http://localhost:3000/portal?dni=30123456`).

---

## 🗺️ Roadmap Evolutivo (Próximos Sprints)

- [x] **Sprint 1:** Motor Híbrido, Doble Timer Anti-Inflación, FIFO, Cumpleaños y POS.
- [x] **Sprint 2:** Importador Universal de CSV con Wizard y Presets (Maxirest, Tango).
- [x] **Sprint 3:** Integración con API Pública de Fudo POS (RF-01).
- [x] **Sprint 4:** Automatización de Tareas Programadas (Crons nocturnos) y Dashboard Analítico de Backoffice (RF-05, RF-06).
- [x] **Sprint 5:** Módulo de Autenticación de Administrador (Login con contraseña/PIN y roles) & Gestor de Catálogo de Premios y Canjes (CRUD interactivo desde el Backoffice).
- [x] **Sprint Futuro A:** Portal Web del Cliente (Tarjeta Digital PWA sin login y QR dinámico).
- [ ] **Sprint Futuro B:** Auto-Acreditación por Escaneo de Tickets Fiscales (Lector web HTML5 de QR fiscal AFIP/ARCA).
- [ ] **Sprint Futuro C:** Notificaciones automáticas por WhatsApp Business API (Bienvenida, Día 75, Saludo Cumpleaños, Hitos).
- [ ] **Sprint Futuro D:** Pases Nativos para Google Wallet y Apple Wallet (`.pkpass`).
- [ ] **Sprint Futuro E:** Operación Rápida de Salón para Mozos & Resiliencia Offline.
- [ ] **Sprint Futuro F:** Motor de Campañas Dinámicas (Multiplicadores Días Valle, Happy Hour y Franjas Horarias).
- [ ] **Sprint Futuro G:** Programa de Referidos ("Traé a un Amigo" & Recompensas Cruzadas).
- [x] **Sprint Futuro H:** Inteligencia de Clientes (Segmentación RFM Automática) & Pasivo Contable de Puntos.
- [ ] **Sprint Futuro I:** Encuestas de Satisfacción Express (NPS Post-Consumo) & Reputación en Google Maps.
- [ ] **Sprint Futuro J:** Seguridad Operativa, Auditoría de Cajas y Detección Antifraude.

---

## 📋 Detalle de Especificaciones por Sprint (Para el SRS / Backlog)

### Sprint Futuro B: Auto-Acreditación por Escaneo de Tickets Fiscales (RF-07)
* **Objetivo:** Permitir que los comensales se auto-acrediten los puntos de su ticket directamente desde su celular escaneando el código QR fiscal impreso en el ticket de caja.
* **Entregables:**
  * **Lector de Cámara Web (HTML5):** Lector web responsivo accesible desde la PWA del cliente para escanear el QR fiscal de AFIP/ARCA o tipear manualmente el número de comprobante emitido por Fudo/Maxirest.
  * **Motor de Validación Antifraude:**
    1. Localiza la venta en `sales` mediante `external_sale_id`.
    2. Valida que `customer_id` no esté asignado (comprobante no reclamado previamente).
    3. Verifica ventana de antigüedad (máximo 48 horas corridas desde la emisión).
    4. Límite estricto de 1 comprobante diario auto-acreditado por comensal.
  * **Acreditación Atómica:** Vinculación de la venta al comensal, generación del lote de puntos en `points_batches` y reseteo de la ventana de inactividad a 90 días (Timer 1).

### Sprint Futuro C: Integración de Notificaciones (WhatsApp Business API)
* **Objetivo:** Mantener enganchado al comensal mediante disparadores de mensajería transaccional y preventiva sin depender de correo electrónico.
* **Entregables:**
  * **Disparador de Bienvenida:** Envío automático del link directo a su tarjeta digital PWA tras registrar su primer consumo en el local.
  * **Alerta de Rescate (Día 75):** Mensaje automatizado notificando que tiene puntos acumulados próximos a caducar en 15 días si no registra una visita.
  * **Saludo de Cumpleaños:** Mensaje en su fecha natalicia avisando que su postre de cortesía de la casa ya está disponible.
  * **Hitos de Frecuencia:** Notificación al desbloquear sellos de visita clave (ej. 3ª, 5ª o 10ª visita).

### Sprint Futuro D: Pases Nativos para Billeteras (Google Wallet & Apple Wallet)
* **Objetivo:** Brindar acceso en 1 solo clic desde el sistema operativo del teléfono móvil mediante pases nativos guardados en el dispositivo.
* **Entregables:**
  * **Generador de Pases `.pkpass` y Google Wallet Pass:** Generación dinámica de credenciales digitales para Apple Wallet y Google Wallet con código QR personal y nivel de membresía.
  * **Notificaciones Push y Geofencing:** Avisos de saldo actualizado y recordatorios sutiles por geolocalización al estar en un radio cercano al local gastronómico.

### Sprint Futuro E: Operación Rápida de Salón para Mozos & Resiliencia Offline
* **Objetivo:** Agilizar los canjes de beneficios directamente en la mesa y garantizar la continuidad operativa si se cae el servicio de internet en el salón.
* **Entregables:**
  * **Web App Mobile para Mozos (Mozo-View):** Interfaz ultrarrápida adaptada a smartphone con autenticación por PIN personal para buscar clientes por DNI/QR, consultar recompensas disponibles y debitar canjes en mesa sin depender de la caja central.
  * **Modo Offline PWA (IndexedDB + Service Workers):** Almacenamiento local de la base de clientes y cola de transacciones pendientes en el navegador de la caja.
  * **Sincronización en Segundo Plano (Background Sync):** Detección automática del restablecimiento de red y vaciado ordenado de la cola hacia PostgreSQL garantizando idempotencia.

### Sprint Futuro F: Motor de Campañas Dinámicas (Multiplicadores Días Valle y Happy Hour)
* **Objetivo:** Llenar el local en franjas horarias de baja demanda mediante incentivos dinámicos de acumulación acelerada de puntos.
* **Entregables:**
  * **Reglas de Multiplicadores Temporales:** Configuración en `loyalty_settings` y panel de administración de multiplicadores de puntos (ej. *x1.5*, *x2*, *x3*) condicionados por día de la semana y rango horario (Happy Hour, almuerzos de lunes a miércoles, días de lluvia o eventos especiales).
  * **Cálculo Automático en Ingesta (POS y Fudo):** El motor central detecta automáticamente la franja horaria de la venta y aplica la bonificación de puntos con desglose claro en el ticket digital y en `points_history` (ej. *"Consumo base: 50 pts • Promo Happy Hour x2: +50 pts bonus"*).
  * **Banners en Tarjeta Web PWA:** Notificación visual en vivo en la tarjeta del comensal informando las promociones horarias activas para incentivar su consumo inmediato.

### Sprint Futuro G: Programa de Referidos ("Traé a un Amigo" & Recompensas Cruzadas)
* **Objetivo:** Convertir a los comensales habituales en promotores activos de marca, atrayendo nuevos clientes de forma viral y medible.
* **Entregables:**
  * **Módulo "Traé a un Amigo":** Generación de enlace y código único de referidos dentro de la Tarjeta Web PWA del comensal, con botón de 1 clic para compartir por WhatsApp.
  * **Disparador de Recompensa Cruzada:** Acreditación atómica de un bono de puntos o beneficio de cortesía tanto al comensal anfitrión como al invitado en cuanto este último realiza su primera visita válida en el local.
  * **Métricas de Embajadores en Backoffice:** Panel de seguimiento en tiempo real que mide clientes promotores más activos, tasa de conversión de invitados y facturación generada por referidos.

### Sprint Futuro H: Inteligencia de Clientes (RFM) & Control de Pasivo Contable
* **Objetivo:** Proporcionar herramientas analíticas avanzadas para no spamear a la base y monitorear la salud financiera del programa de puntos.
* **Entregables:**
  * **Clasificador Automático RFM (Recencia, Frecuencia, Monto):** Segmentación automática de la base en 4 cuadrantes (*Champions*, *Prometedores*, *En Riesgo*, *Dormidos*) calculada en un cron semanal.
  * **Filtros de Exportación Quirúrgica:** Posibilidad de descargar listados segmentados (teléfonos/emails) para campañas dirigidas en WhatsApp o Meta Ads.
  * **Cálculo de Pasivo Contable Flotante:** Métrica en el Dashboard de Backoffice que calcula la deuda total de puntos circulantes valorizada al costo de reposición promedio (CMV) del catálogo de premios.

### Sprint Futuro I: Encuestas de Satisfacción Express (NPS) & Reputación Local
* **Objetivo:** Detectar malas experiencias antes de que lleguen a redes y potenciar las valoraciones positivas en Google Maps.
* **Entregables:**
  * **Disparador Post-Consumo:** Envío programado de un link web/WhatsApp 1 hora después del cierre del ticket con una pregunta directa de calificación (1 a 5 estrellas).
  * **Filtro de Desvío Inteligente:**
    * Si califica 4 o 5 estrellas: Redirección con 1 clic al enlace oficial de reseñas de **Google Business Profile**.
    * Si califica 1 a 3 estrellas: Apertura de formulario privado de descargo que dispara una alerta inmediata por correo o dashboard al encargado del turno.
  * **Panel de Reputación:** Métrica de NPS interno consolidado por mes y por camarero/caja.

### Sprint Futuro J: Seguridad Operativa, Auditoría y Detección Antifraude
* **Objetivo:** Blindar el sistema contra fugas de inventario, canjes ficticios y manipulación indebida de saldos en caja.
* **Entregables:**
  * **Límites Operativos por Rol:** Restricción de canjes o acreditaciones manuales máximas que un usuario con rol "Cajero" puede emitir por turno sin autorización de un "Encargado/Admin".
  * **Detector de Anomalías:** Alertas de transacciones sospechosas (ej. mismo DNI sumando consumos en dos cajas simultáneamente, o carga repetitiva de tickets de montos idénticos en lapsos menores a 10 minutos).
  * **Log Inmutable de Auditoría:** Registro de IP, agente de usuario y usuario autenticado en cada movimiento manual de `points_history`.

