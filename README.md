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
### 11. Arquitectura Desacoplada de Adaptadores POS & Traductor Canónico (POS Translator)
- **Patrón Gateway Agnóstico (`PosGateway` & `IPosAdapter`):**
  - Ubicación: [`src/lib/pos/`](src/lib/pos).
  - Diseñado para desacoplar el motor central de fidelización de las particularidades de cada sistema de punto de venta gastronómico (Fudo, Maxirest, Bistro, etc.).
  - Provee una interfaz común para verificación de conectividad, consulta de ventas cerradas (`fetchClosedSales`), gestión de clientes y traducción canónica bidireccional.
- **Traductor Canónico Bidireccional (`FudoTranslator`):**
  - **Mapeo a Modelo Canónico (`toCanonicalSale`):** Normaliza ventas crudas JSON:API de Fudo hacia `CanonicalSale` (`externalSaleId`, `totalAmount`, `saleDate`, `saleType`, `status`, `customer`, `raw`).
  - **Normalización Inteligente de Comandas:** Mapea automáticamente salón, mostrador/takeaway y deliveries (`TABLE`, `COUNTER`, `DELIVERY`) analizando flags como `takeAway`, `delivery` y asignación de mesa.
  - **Traducción Inversa de Clientes (`toPosCustomerPayload`):** Convierte perfiles del programa de fidelización a la especificación JSON:API de Fudo para dar de alta clientes de forma remota.
  - **Normalizador de Eventos de Webhook (`toCanonicalEvent`):** Interpreta payloads entrantes y los transforma en eventos normalizados (`SALE_CLOSED`, `SALE_CANCELED`, `CUSTOMER_CREATED`).
- **Retrocompatibilidad Completa:**
  - El cliente histórico `FudoApiClient` y la función `syncFudoSales()` delegan internamente al nuevo adaptador sin romper las llamadas preexistentes.

### 12. Ingesta en Tiempo Real, Daemon Listener Continuo & Webhooks
- **Daemon de Escucha Continua (`FudoRealtimeListener` / `npm run listener`):**
  - Script en segundo plano ([`src/scripts/pos-realtime-listener.ts`](src/scripts/pos-realtime-listener.ts)) para sincronización en vivo de alta frecuencia (sondeo continuo cada 1.5s - 5s).
  - Procesa e ingesta instantáneamente ventas cerradas y cancelaciones sin depender exclusivamente del cron nocturno.
- **Receptor y Procesador de Webhooks (`/api/pos/webhook/[provider]`):**
  - Endpoint REST preparado para recibir notificaciones HTTP POST en tiempo real enviadas por sistemas POS.
  - Ingesta atómica de la comanda con cálculo de puntos por consumo y visitas.
- **Bus de Eventos Pub/Sub en Memoria (`PosEventBus`):**
  - Desacopla la ingesta del sistema de notificación a la interfaz gráfica.
  - Emisión de eventos `SALE_INGESTED`, `SALE_VOIDED` y `SYNC_COMPLETED`.
- **Transmisión Server-Sent Events (SSE) & Refresco Reactivo en Pantalla:**
  - Canal de streaming SSE en `/api/pos/realtime/stream`.
  - Componente frontend `AutoSyncWatcher` que recibe los eventos SSE y actualiza en tiempo real el perfil del comensal y las métricas de caja sin recargar el navegador.

### 13. Módulo de Anulación de Ventas & Rollback Atómico (Manual y Sincronizado)
- **Rollback Atómico en Transacción SQLite (`cancelSale`):**
  - Reversión íntegra de la operación con protección contra dobles anulaciones.
  - **Puntos:** Deducción del saldo de puntos acumulados (`points_balance`) y cambio de estado del lote FIFO a `DEPLETED` con `points_remaining = 0`.
  - **Asiento Compensatorio:** Genera un registro negativo (`-X pts`) en `points_history` con motivo para auditoría contable.
  - **Visitas:** Resta 1 visita (`visit_count`) y recalcula `last_visit_at` solo si la venta había computado visita (`visit_added = 1`). Si fue venta de mostrador/takeaway, no altera las visitas.
  - **Facturación:** Ajusta el gasto acumulado (`total_spent`).
- **Sincronización Automática con Fudo API:**
  - Consulta ampliada a `filter[saleState]=in.(CLOSED,CANCELED)`.
  - Si una venta cerrada se anula en Fudo, se revierte de forma automática en GastroBumeran y se reporta en `canceledCount`.
- **Buscador & Modal de Anulación Manual (`VoidSaleModal.tsx`):**
  - Modal accesible desde la barra superior para buscar tickets por ID, Fudo ID, comensal o teléfono y anular ventas con confirmación en dos pasos.
### 14. Motor de Campañas Dinámicas & Días Valle (Sprint Futuro F)
- **Multiplicadores Temporales y Bonos Fijos:**
  - Configuración de campañas promocionales con multiplicadores de puntos (ej. *x1.5*, *x2*, *x3*) y puntos adicionales directos (ej. *+50 pts bonus*).
  - Reglas condicionales avanzadas:
    - **Días de la semana:** Selección interactiva individual (Lun a Dom), días hábiles o fines de semana.
    - **Ventana horaria:** Rango de hora inicio y fin (ej. *18:00 a 20:30 hs*) para Happy Hour de salón o promociones nocturnas.
    - **Sector / Canal de Venta:** Filtrado por *Salón / Mesas*, *Mostrador / Take Away*, *Delivery* o *Todos los canales*.
    - **Gasto Mínimo:** Umbral de ticket requerido para activar la promoción.
    - **Prioridad de Desempate:** Resolución inteligente si múltiples campañas aplican simultáneamente, seleccionando siempre la que otorgue el mayor beneficio al comensal.
- **Evaluación y Acreditación Automática en el Motor de Fidelización (`processSale`):**
  - Detección en tiempo real de la franja horaria, día y sector de la venta (aplicable en POS, Fudo API, Webhooks y CSV).
  - Cálculo transparente: `basePoints = floor(amount / rate)` y `extraPoints = floor(basePoints * (multiplier - 1)) + bonus_points`.
  - Desglose contable en el ticket y en `points_history` (ej. `[🔥 Happy Hour After Office (x2): 150 base + 150 promo]`).
  - Persistencia en la tabla `sales` (`campaign_id`, `campaign_multiplier`, `campaign_bonus_points`) y consolidación atómica en lote FIFO con vigencia normal.
  - Rollback exacto y atómico en anulación (`cancelSale`): revierte la totalidad de los puntos acreditados (base + bono promocional).
- **Banner Promocional Dinámico en la Tarjeta Web del Cliente (PWA `/portal`):**
  - Componente visual `ActiveCampaignsBanner` que muestra a los comensales las promociones vigentes con badges de días, horarios y multiplicadores para estimular la concurrencia en días valle.
- **Feedback en Vivo en la Pantalla de Caja POS (`SaleForm`):**
  - Cálculo en tiempo real mientras el cajero tipea el importe o selecciona presets de ticket, mostrando el desglose `+X Puntos a acreditar (🔥 Campaña Activa: +Base +Promo)`.
- **Modal de Gestión Integral en Backoffice (`CampaignsModal`):**
  - Acceso directo desde la barra de navegación con botón **"Campañas"**.
  - **Plantillas Rápidas Gastronómicas (1-Click Presets):**
    - *Happy Hour After Office (x2 Puntos, Lun-Vie 18:00 a 20:30, Salón)*
    - *Almuerzos Días Valle (x1.5 Puntos, Mar-Mié 12:00 a 15:30, Salón)*
    - *Fin de Semana Delivery (+100 pts Bonus, Vie-Dom 19:00 a 23:59, Delivery)*
    - *Súper Domingo Salón (x3 Puntos, Dom 19:30 a 23:30, Salón)*
  - Interruptor toggle de activación/pausa instantánea, edición de reglas temporales y eliminación.

### 15. Exclusión Estricta de Personas Jurídicas / CUITs de Empresas (Personas Humanas Exclusivas)
- **Fundamento de Negocio:**
  - El programa de fidelización premia y retiene exclusivamente a **personas humanas** (consumidores finales reales).
  - Las cuentas corporativas, facturas A a empresas, razones sociales comerciales (SRL, SA, SAS) y entes estatales están formalmente excluidas de la emisión de puntos y recompensas.
- **Detección Algorítmica AFIP / ARCA ([`cuit.ts`](src/lib/validation/cuit.ts)):**
  - **Personas Jurídicas (Empresas):** CUITs de 11 dígitos con prefijos oficiales `30` (sociedades comerciales), `33` (entes públicos, bancos, instituciones), `34` (sociedades especiales) y `50`, `51`, `55` (personas jurídicas del exterior).
  - **Personas Humanas Aprobadas (Sin falsos positivos):** DNIs tradicionales de 6 a 8 dígitos (incluso aquellos que inician con `30` o `33`, ej. `30.123.456`) y CUILs personales de 11 dígitos (prefijos `20`, `27`, `23`, `24`).
- **Blindaje Multicapa en el Sistema:**
  - **Repositorio de Clientes (`createCustomer`):** Bloqueo estricto a nivel de base de datos que rechaza el alta de CUITs jurídicos con excepción explicativa.
  - **API REST (`POST /api/customers`):** Validación previa que responde con código HTTP 400 y mensaje descriptivo.
  - **Alta en Caja POS (`NewCustomerModal`):** Validación reactiva en vivo en la interfaz de caja; si el operador tipea un CUIT corporativo, el formulario despliega una alerta explicativa y bloquea el botón de confirmación.
  - **Pasarela POS / Fudo (`PosGateway`):** Omite clientes corporativos durante la sincronización de directorio (`syncCustomers`) y trata ventas con Factura A / CUIT empresarial como `UNASSIGNED` en `ingestCanonicalSale` (sin asignación de puntos ni alta errónea en fidelidad).
  - **Importador Universal CSV (`processCsvBatch` & `CsvWizardModal`):** Filtra y omite automáticamente registros asociados a empresas, agrega la métrica *"Empresas Excluidas"* en las tarjetas KPI del resumen del lote e identifica las filas omitidas en el reporte interactivo.
  - **Migración Segura Retroactiva:** Al inicializar la base de datos se desadscriben (`loyalty_enrolled = 0`) clientes históricos que registraban CUIT de empresa.

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

# Iniciar el daemon de escucha continua en tiempo real (sondeo de alta frecuencia)
npm run listener

# Ejecutar pruebas del motor central (Doble Timer, FIFO, Antifraude y Cumpleaños)
npx tsx src/scripts/test-engine.ts

# Ejecutar pruebas del traductor canónico POS y adaptadores desacoplados
npx tsx src/scripts/test-pos-translator.ts

# Ejecutar pruebas del listener en tiempo real y procesador de webhooks
npx tsx src/scripts/test-realtime-listener.ts

# Ejecutar pruebas de anulación de ventas (rollback atómico y sync Fudo)
npx tsx src/scripts/test-void-sale.ts

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

# Ejecutar pruebas del Motor de Campañas Dinámicas y Días Valle (Sprint F)
npx tsx src/scripts/test-campaigns.ts

# Ejecutar pruebas de Personalización de Tarjeta (Sprint O) y Preparación Cloud-SaaS
npx tsx src/scripts/test-sprint-o-local.ts

# Exportar base de datos SQLite para migración directa a Cloud-SaaS
npx tsx src/scripts/export-to-cloud-saas.ts
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para interactuar con la plataforma:
- **Punto de Venta & Backoffice:** `http://localhost:3000` (Credenciales Admin Demo: `admin@gastrobumeran.com` / `admin123` o PIN rápido `1234`).
- **Pestaña de Marca y Tarjeta:** Pestaña *"Personalización de Tarjeta & Marca"* dentro del Backoffice para customizar logo, colores y sellos en tiempo real con Live Preview.
- **Portal Web del Cliente (PWA):** `http://localhost:3000/portal` o acceso por local en `http://localhost:3000/r/mi-resto`.

---

## 🗺️ Roadmap Evolutivo (Próximos Sprints)

### ✅ Módulos Implementados
- [x] **Sprint 1:** Motor Híbrido, Doble Timer Anti-Inflación, FIFO, Cumpleaños y POS.
- [x] **Sprint 2:** Importador Universal de CSV con Wizard y Presets (Maxirest, Tango).
- [x] **Sprint 3:** Integración con API Pública de Fudo POS (RF-01), Adaptadores Desacoplados (POS Translator) y Daemon Listener en Tiempo Real.
- [x] **Sprint 4:** Automatización de Tareas Programadas (Crons nocturnos) y Dashboard Analítico de Backoffice (RF-05, RF-06).
- [x] **Sprint 5:** Módulo de Autenticación de Administrador (Login con contraseña/PIN con teclado físico y roles) & Gestor de Catálogo de Premios y Canjes (CRUD interactivo desde el Backoffice).
- [x] **Sprint Futuro A:** Portal Web del Cliente (Tarjeta Digital PWA sin login y QR dinámico).
- [x] **Sprint Futuro A2:** Módulo de Anulación de Ventas & Rollback Atómico de Puntos y Visitas (Manual y Sincronizado).
- [x] **Sprint Futuro F:** Motor de Campañas Dinámicas (Multiplicadores Días Valle, Happy Hour, Desglose en POS y PWA).
- [x] **Sprint Futuro H:** Inteligencia de Clientes (Segmentación RFM Automática) & Pasivo Contable de Puntos.
- [x] **Sprint Futuro O (Local-Offline):** Personalización de Tarjeta del Cliente & Marca (Live Preview de Logo, Colores Primarios, Sellos temáticos y QR con slug `/r/[slug]`) y Preparación de Migración Cloud-SaaS en SQLite.

### 🚀 Prioridad Inmediata — Arquitectura Multi-Restaurante (SaaS) & Landing Pública
> *Ejecución secuencial recomendada (K → L → M → N → O → P) para asentar las fundaciones multi-tenant antes de sumar nuevos módulos operativos.*

- [ ] **Sprint Futuro K:** Fundaciones Multi-Tenant & Aislamiento de Datos por Restaurante (Modelo de Datos, Aislamiento de Comensales y Preparación para PostgreSQL).
- [ ] **Sprint Futuro L:** Seguridad, Sesión y Panel por Restaurante (RBAC, Terminal PIN por Local y Blindaje de APIs).
- [ ] **Sprint Futuro M:** Registro y Onboarding de Restaurantes (Verificación de Email, Modo Prueba Demo y Wizard de Configuración).
- [ ] **Sprint Futuro N:** Integraciones POS y Procesos en Segundo Plano por Restaurante (Fudo, Webhooks y Crons Aislados).
- [ ] **Sprint Futuro O:** Portal del Cliente por Local & Verificación OTP (Tarjeta Independiente por Restaurante, Validación WhatsApp/SMS y PWA con Marca Propia).
- [ ] **Sprint Futuro P:** Landing Page Pública, Planes & Precios y Accesos Centralizados (Showcase Comercial, Formulario Extensible a Email y Accesos para Admins y Clientes).
- [ ] **Sprint Futuro Q:** Consola de Plataforma & Super-Admin (Gestión Global de Restaurantes, Leads y Auditoría).

### 🔮 Extensiones Funcionales (Post-SaaS)
- [ ] **Sprint Futuro B:** Auto-Acreditación por Escaneo de Tickets Fiscales (Lector web HTML5 de QR fiscal AFIP/ARCA).
- [ ] **Sprint Futuro C:** Notificaciones automáticas por WhatsApp Business API (Bienvenida, Día 75, Saludo Cumpleaños, Hitos).
- [ ] **Sprint Futuro D:** Pases Nativos para Google Wallet y Apple Wallet (`.pkpass`).
- [ ] **Sprint Futuro E:** Operación Rápida de Salón para Mozos & Resiliencia Offline.
- [ ] **Sprint Futuro G:** Programa de Referidos ("Traé a un Amigo" & Recompensas Cruzadas por Local).
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

---

### Sprint Futuro K: Fundaciones Multi-Tenant & Aislamiento de Datos por Restaurante (Preparación para PostgreSQL)
* **Objetivo:** Introducir la entidad `Restaurant` / local gastronómico como unidad raíz de particionamiento de datos, aislando comensales, ventas, configuración y saldos por restaurante, manteniendo compatibilidad inmediata con SQLite y garantizando migración directa a PostgreSQL.
* **Entregables:**
  * **Entidad `restaurants` y Aislamiento Estricto:**
    * Tabla `restaurants`: `id` (UUID), `slug` (VARCHAR unique, apto para URLs y futuro subdominio), `name`, `legal_name`, `cuit`, `status` (`ACTIVE`, `TRIAL_DEMO`, `SUSPENDED`), `logo_url`, `primary_color`, `accent_color`, `address`, `city`, `phone`, `whatsapp`, `instagram`, `timezone` (default `America/Argentina/Buenos_Aires`), `created_at`.
    * Inclusión de columna `restaurant_id` en todas las tablas de negocio: `customers`, `sales`, `points_batches`, `points_history`, `loyalty_settings`, `loyalty_rewards`, `loyalty_campaigns`, `fudo_config`, `cron_logs`, `admin_users`, `csv_mapping_presets`.
  * **Comensales Independientes por Restaurante (Sin Fidelización Cruzada):**
    * Un mismo DNI/CUIT puede existir en múltiples restaurantes con perfiles, puntos, visitas, historial de transacciones y aniversarios de cumpleaños 100% aislados.
    * Reconstrucción segura de tablas en SQLite: sustitución de restricciones globales (`document_number UNIQUE`, `external_sale_id UNIQUE`, `fudo_customer_id UNIQUE`) por claves compuestas `UNIQUE(restaurant_id, document_number)`, `UNIQUE(restaurant_id, external_sale_id)`, `UNIQUE(restaurant_id, fudo_customer_id)`.
  * **Arquitectura de Repositorios Tenant-Aware:**
    * Todas las funciones de base de datos (`customer-repo`, `campaign-repo`, `settings-repo`, `analytics-repo`, `loyalty/engine`) exigen `restaurantId` como parámetro mandatorio estricto sin fallbacks globales.
  * **Migración Cero-Downtime de Datos Existentes:**
    * Creación automática del restaurante semilla `demo` ("GastroBumeran Demo Resto", slug: `demo`) asignándole todos los datos preexistentes.
    * Script automatizado de aprovisionamiento de nuevo restaurante (`provisionRestaurant(restaurantId)`) con presets de premios, settings anti-inflación y campañas por defecto.
  * **Preparación para Migración Futura a PostgreSQL:**
    * DDL compatible en `schema.sql` y tests de paridad de tipos para habilitar el traspaso a PostgreSQL sin rediseño estructural.
  * **Suite de Pruebas:** `src/scripts/test-multitenancy.ts` validando independencia de saldos para el mismo DNI en dos locales, aislamiento de ventas y FIFO sin fugas de datos entre tenants.

### Sprint Futuro L: Seguridad, Sesión y Panel por Restaurante (RBAC & Terminal PIN por Local)
* **Objetivo:** Blindar la plataforma asegurando que cada operador y administrador acceda únicamente a la información de su restaurante, cerrando el acceso a APIs sin sesión y aislando los códigos PIN por local.
* **Entregables:**
  * **Blindaje Integral de APIs (`requireSession` Middleware):**
    * Helper centralizado de autorización que valida JWT y asocia `restaurant_id` verificado desde la cookie segura `gastrobumeran_session` a cada llamada de `/api/*`. Ningún endpoint administrativo aceptará `restaurant_id` por body/query para evitar spoofing o fuga de datos.
  * **Autenticación con Roles por Restaurante (RBAC):**
    * Roles por local: `OWNER` (dueño, acceso total), `ADMIN` (gerente), `SUPERVISOR` (encargado de turno) y `CASHIER` (cajero de salón).
    * Rol transversal de plataforma: `PLATFORM_ADMIN` (para soporte global de GastroBumeran).
  * **Terminal PIN Aislado por Local (`/r/[slug]/caja`):**
    * Resolución de PIN numérico de 4 dígitos circunscripta al restaurante activo, eliminando colisiones entre distintos locales.
    * Modo "Terminal de Salón" con cookie de dispositivo de terminal fija.
  * **Mudanza del Panel Operativo y Backoffice:**
    * Migración de la vista operativa actual `/` hacia la ruta `/admin` (con branding y selector de contexto de local).
    * `proxy.ts` (Next.js 16) para redirección automática y control de acceso.
  * **Aislamiento en Streaming y Tiempo Real:**
    * Canales Server-Sent Events (SSE) y bus de eventos `PosEventBus` particionados por `restaurant_id` (notificaciones de ventas y anulaciones solo al local correspondiente).

### Sprint Futuro M: Registro y Onboarding de Restaurantes (Email Verification & Modo Prueba Demo)
* **Objetivo:** Permitir el auto-registro de nuevos locales gastronómicos con validación de identidad por correo y habilitación en modo de prueba/demo limitado.
* **Entregables:**
  * **Pantalla de Registro Público (`/registro`):**
    * Formulario de alta para restaurantes: Nombre del local, razón social, CUIT del comercio, rubro gastronómico (cafetería, cervecería, parrilla, pizzería, sushi, etc.), teléfono/WhatsApp, ciudad y credenciales del usuario propietario (`OWNER`).
    * Generador inteligente de `slug` con verificación de disponibilidad en tiempo real (ej. `la-parrilla-del-parque`).
  * **Verificación de Email Transaccional:**
    * Generación de tokens criptográficos de un solo uso con ventana de expiración (24 hs).
    * Flujo de verificación de email: pantalla de ingreso de código o enlace de confirmación (`/verificar-email?token=...`).
  * **Régimen de Modo de Prueba Demo (`TRIAL_DEMO`):**
    * Los locales inician en estado `TRIAL_DEMO` tras verificar su correo.
    * Gating de funcionalidades: hasta 50 comensales registrados, hasta 100 ventas sincronizadas y banner informativo en el backoffice indicando entorno de prueba. Funciones avanzadas (exportación masiva RFM y sincronización continua en vivo) sujetas a activación.
  * **Wizard de Onboarding en 4 Pasos (`/admin/onboarding`):**
    1. *Identidad:* Carga de logo, color primario y previsualización de tarjeta digital.
    2. *Reglas de Negocio:* Tasa de puntos ($ por punto), umbral de visita y puntos de bienvenida.
    3. *Catálogo Inicial:* Selección de catálogo sugerido por rubro gastronómico con 1 clic.
    4. *Kit de Puesta en Marcha:* Descarga inmediata del QR del local en PDF/PNG para imprimir en cartas y mesas.
  * **Diseño Arquitectónico Abierto a Subdominios:**
    * Middleware y capa de routing estructurados con resolución agnóstica (`resolveRestaurantContext(req)`) que soporte tanto `/r/[slug]` en fase actual como `[slug].gastrobumeran.com` en fase posterior sin reescribir controladores.

### Sprint Futuro N: Integraciones POS y Procesos en Segundo Plano por Restaurante
* **Objetivo:** Desacoplar las integraciones POS (Fudo API, Webhooks, CSV) y los motores de background (scheduler y crons) para operar concurrentemente por local.
* **Entregables:**
  * **Credenciales POS por Restaurante con Cifrado en Reposo:**
    * Cada restaurante gestiona sus propias credenciales (`fudo_config`: `api_key`, `api_secret`, URLs) encriptadas con AES-256-GCM.
    * Conector sandbox independiente por restaurante.
  * **Scheduler y Crons Multi-Tenant:**
    * Scheduler en segundo plano que itera sobre los restaurantes en estado `ACTIVE` o `TRIAL_DEMO`.
    * Bloqueo concurrente por local (para que la latencia de sincronización de un restaurante no afecte al resto).
    * Auditoría nocturna de caducidad (90d / 365d) y recálculo de cuadrantes RFM evaluados con la zona horaria (`timezone`) de cada restaurante.
  * **Recepción de Webhooks Dinámicos:**
    * Endpoints versionados con token de autenticación del restaurante: `/api/pos/webhook/[provider]/[restaurantToken]`.
  * **Importador Universal CSV Acotado:**
    * Procesamiento de lotes CSV vinculado estrictamente al `restaurant_id` activo, con presets públicos compartidos y presets privados del local.
  * **Bitácora `cron_logs` con Alcance de Local:**
    * Visualización transparente del historial de ejecuciones dentro del backoffice de cada restaurante.

### Sprint Futuro O: Portal del Cliente por Local & Verificación OTP (Tarjeta Independiente con WhatsApp/SMS)
* **Objetivo:** Ofrecer una tarjeta digital PWA completamente personalizada por local gastronómico, protegiendo los datos del comensal mediante verificación OTP por WhatsApp o SMS y garantizando que las tarjetas de diferentes locales coexistan en el teléfono sin interferencias.
* **Entregables:**
  * **Portal de Marca Propia (`/r/[slug]`):**
    * Acceso directo a la tarjeta digital del restaurante con su logo, colores y catálogo exclusivo.
    * Manifest PWA dinámico (`/r/[slug]/manifest.webmanifest`) que permite instalar la aplicación en el móvil con el nombre e ícono del restaurante ("Mi Tarjeta - La Guitarrita").
    * Aislamiento en el navegador: almacenamiento en `localStorage` con clave segmentada `gastrobumeran_card_[slug]` (un comensal puede tener instalada la tarjeta de varios restaurantes en su mismo celular sin colisiones).
  * **Verificación OTP de Seguridad (WhatsApp / SMS):**
    * Requisito de autenticación sin contraseña: el comensal ingresa su DNI/teléfono y recibe un código OTP temporal de 6 dígitos vía WhatsApp o SMS antes de desplegar saldos y permitir canjes.
    * Prevención de accesos de terceros y cumplimiento de normativas de privacidad (Ley 25.326).
  * **Códigos QR de Escaneo con Prefijo de Local:**
    * Formato de QR dinámico: `GASTRO:[slug]:DNI:[dni]`.
    * El buscador de la Caja POS valida que el código escaneado pertenezca a su propio restaurante, mostrando alerta clara si un comensal intenta presentar un QR de otro comercio.
  * **Catálogo de Premios y Campañas Filtradas:**
    * El comensal solo visualiza las recompensas, promociones de días valle (Happy Hour) y beneficios de cumpleaños pertenecientes al local actual.

### Sprint Futuro P: Landing Page Pública, Planes & Precios y Accesos Centralizados
* **Objetivo:** Publicar una landing page moderna, institucional y comercial en `/` que promocione GastroBumeran, explique el funcionamiento del sistema, exponga la propuesta de planes comerciales, canalice consultas de contacto y centralice los accesos para comensales y administradores.
* **Entregables:**
  * **Página Principal de Alto Impacto (`/`):**
    * *Hero Section:* Propuesta de valor clara ("La plataforma inteligente de fidelización gastronómica: multiplicá la recurrencia de tus comensales sin ceder tus márgenes"). Botones de acción principales: **"Registrá tu Restaurante"** (lleva a `/registro`) y **"Ver Demo en Vivo"**.
    * *Pilares del Sistema:* Explicación visual del Motor Híbrido (Puntos + Sellos), el Doble Timer Anti-Inflacionario (90d / 365d con consumo FIFO), el Módulo de Cumpleaños, las Campañas de Días Valle y la Inteligencia RFM.
    * *Showcase de Integraciones:* Compatibilidad con Fudo POS, Maxirest, Tango y formatos CSV universales.
    * *Cómo Funciona:* Paso a paso interactivo para restaurantes (Configurá en 5 minutos, sincronizá tus ventas, fidelizá en automático) y para comensales (Sin apps pesadas: tarjeta web PWA con QR).
    * *Soporte Light / Dark Mode:* Integración nativa con el `ThemeContext` preexistente.
  * **Sección de Planes y Estructura de Precios:**
    * Comparativa de planes:
      * *Plan Starter Demo:* Prueba sin costo hasta 50 clientes y 100 tickets, funciones esenciales de POS y tarjeta PWA.
      * *Plan Pro Gastronómico:* Clientes y ventas ilimitadas, sincronización automática Fudo API en tiempo real, motor de campañas dinámicas y auditoría anti-inflación.
      * *Plan Cadena / Multi-Sucursal:* Múltiples locales independientes, analítica comparativa de red, soporte prioritario y adaptadores a medida.
    * Llamados a la acción directos: "Empezar Prueba Gratis" y "Consultar por Plan Cadena" (orientado a captar interesados sin cobrar pasarela automatizada por el momento).
  * **Canalización de Accesos en Encabezado:**
    * Botón **"Ingresar (Restaurantes)"**: Dirige a `/ingresar` (login de dueños y administradores para acceder a su backoffice `/admin`).
    * Botón **"Soy Cliente"**: Despliega un modal visual interactivo explicando que no se requiere registro en la web central y guiando al comensal a **escanear el código QR del local** impreso en su ticket o mesa para acceder a su tarjeta digital PWA `/r/[slug]`.
  * **Formulario de Contacto y Captación de Leads:**
    * Formulario comercial: Nombre, Nombre del Restaurante, Cantidad de Sucursales, Sistema POS en uso, Teléfono/WhatsApp, Correo y Consulta.
    * Almacenamiento en tabla `contact_leads` con protección anti-spam (honeypot + rate limit).
    * **Arquitectura Extensible para Avisos por Email:** Módulo desacoplado de despacho de eventos (`onNewLeadCreated`) listo para conectar un proveedor de correo (Resend, SendGrid, Amazon SES o SMTP) en una fase posterior.
    * Enlace directo a WhatsApp comercial para atención inmediata.
  * **SEO, Metadatos y Legales:**
    * Open Graph tags, Twitter cards, `sitemap.ts`, `robots.ts` y páginas de cumplimiento legal (`/terminos` y `/privacidad`).

### Sprint Futuro Q: Consola de Plataforma & Super-Admin (Gestión Global de Locales y Leads)
* **Objetivo:** Dotar al equipo interno de GastroBumeran de una herramienta centralizada para monitorear el crecimiento del SaaS, gestionar el ciclo de vida de los restaurantes y atender leads.
* **Entregables:**
  * **Panel de Control de Plataforma (`/plataforma`):**
    * Acceso exclusivo para usuarios con rol `PLATFORM_ADMIN`.
    * Directorio global de restaurantes con estado (`TRIAL_DEMO`, `ACTIVE`, `SUSPENDED`), métricas de adopción (comensales dados de alta, volumen de tickets fidelizados) y acciones de aprobación/suspensión.
  * **Bandeja de Entrada de Leads:**
    * Visualización y seguimiento de las consultas ingresadas en la landing page con estados de gestión (*Nuevo*, *En Contacto*, *Demostración Realizada*, *Convertido*).
  * **Impersonación Segura para Soporte:**
    * Capacidad auditada para que el equipo de soporte acceda temporalmente a la vista administrativa de un local para brindar asistencia técnica, con log inmutable de auditoría.


