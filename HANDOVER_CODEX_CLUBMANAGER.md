# 🏀 CLUBMANAGER — SaaS de Gestión Integral de Clubes Deportivos
## Handover / Contexto para Continuidad del Desarrollo

> **Última actualización:** 27/11/2026 — Sincronizado contra el código real y el repositorio en GitHub.
> Contiene todas las implementaciones completadas: dirección histórica Calle 33 N° 334,
> los 10 clubes de la liga con sus escudos, landing page centenaria, separación estricta
> de roles (RBAC) y desvinculación de cuotas del carnet digital.

---

### 1. Resumen Ejecutivo y Cliente Objetivo

- **Producto:** SaaS multitenant para la gestión deportiva, médica, financiera y comunicacional de clubes deportivos.
- **Cliente Demo Target:** **Club Atlético Estudiantes de Mercedes (Buenos Aires)** — básquetbol, **Centenario (1926-2026)**. Sede Oficial: **Calle 33 N° 334, Mercedes (Buenos Aires)**.
- **Objetivo:** MVP hiper-pulido y funcional para presentar ante la Comisión Directiva.
- **Estado:** MVP 100% funcional en local y respaldado en la rama `main` de GitHub. `npm run typecheck` pasa limpio (0 errores).

---

### 2. Stack Tecnológico y Arquitectura

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16.4.6** (App Router, Turbopack, RSC + Server Actions) |
| UI | React **19.3.0**, Tailwind CSS **4.3.3** (`@tailwindcss/turbopack`) |
| ORM | Drizzle ORM **0.45.4** + drizzle-kit 0.31 |
| DB local | **PGlite** embebido (WASM) en `.data/pglite` — sin Docker |
| DB producción | PostgreSQL (Supabase) vía `DATABASE_URL` + driver `postgres` 4.1 |
| Validación | Zod **4.6.7** |
| Pagos | SDK `mercadopago` **2.9.0** + checkout demo propio |
| Notificaciones | WhatsApp Cloud API (links `wa.me` + outbox) |
| Runtime | Node 20+, Windows (`D:\000_SaaS\clubmanager`) |

**Detalles críticos de arquitectura**

- **Multitenancy:** toda tabla de datos de club lleva `club_id` y se consulta **siempre** a través de `getTenant()` (`src/server/tenant.ts`). Nunca consultar sin el filtro de club.
- **Separación Estricta de Permisos (RBAC):** `src/lib/permissions.ts` (roles `platform_admin`, `club_admin`, `coach`, `guardian`, `player`). Se valida con `can(ctx, "permiso")` en cada página y Server Action.
- **Planes:** el plan del club habilita módulos (`module: "jugadores" | "cuotas" | "deportivo" | "comunicaciones" | "reportes"`); los ítems de nav se ocultan si el plan no incluye el módulo.
- **Config Next:** usar siempre **`next.config.mjs`**. No renombrar a `.ts` (bug de canonicalización de rutas en Windows con Turbopack/SWC).
- **DB client:** `src/db/client.ts` usa `DATABASE_URL` si existe; si no, PGlite en `.data/pglite` (en `production` cae a `/tmp/clubmanager-pglite` para serverless).
- **Marca:** paleta roja institucional (`--color-brand-*` de `#dc2626` a `#7f1d1d`), azul marino/ink, blanco y dorado centenario en `src/app/globals.css`.

---

### 3. Estado del Repositorio Git

- **Repo:** `https://github.com/panchito49-cloud/clubmanager.git` — branch `main`.
- **Todos los cambios están commiteados y pusheados a GitHub.**
- Últimos commits de referencia:
  - `fa540ee` *fix(medical): consider expiring soon certificates as still legally eligible until expiration date*
  - `c7598fd` *fix(carnet): remove fee status from digital credential and decouple sports eligibility from financial balance*
  - `24ffadd` *fix(players): adapt header, metrics and family links for coach role*
  - `93a92f5` *feat(security): strict RBAC isolation - hide finance/debt/charges from coaches and confine role views*
  - `c86bbe0` *fix(landing): clean transparent circular crest, fix typography and compact fixture cards*
  - `4beb673` *feat(landing): Club Atletico Estudiantes Centenario basketball landing page with official crest and 10 league clubs*
  - `0aa51c0` *feat: complete MVP modules - mobile attendance, guardian portal, WhatsApp comms, executive reports, trips and fixture import*
  - `067a62e` *feat(sports): 10 official basketball league clubs with badges, GPS venues, match scoreboard, fixture seed and CSV template*

---

### 4. Credenciales de Acceso (Entorno Local Demo)

- **URL:** `http://localhost:3000/login`
- **Slug del club demo:** `barrio-norte-demo` (nombre visible en pantalla: "Club Atlético Estudiantes").

| Rol | Usuario | Clave | Perfil de Acceso |
|---|---|---|---|
| Superadmin plataforma | `admin@clubmanager.app` | `CambiarEstaClave123!` | Visión global multiclub (`/admin`) |
| Admin del club | `admin@barrio-norte.demo` | `Demo2026!` | Acceso total directivo y tesorería |
| Entrenador (DT) | `martin.ferreyra@barrio-norte.demo` | `Demo2026!` | Exclusivo deportivo (sin ver finanzas) |
| Entrenadora (DT) | `lucia.benitez@barrio-norte.demo` | `Demo2026!` | Exclusivo deportivo (sin ver finanzas) |
| Tutor / Familia | `carla.gomez@barrio-norte.demo` | `Demo2026!` | Portal familiar de sus propios hijos |
| Jugador | `tomas.gomez@barrio-norte.demo` | `Demo2026!` | Carnet digital y calendario |

**Comandos habituales**

```bash
npm run dev         # Servidor local (Turbopack) en http://localhost:3000
npm run typecheck   # tsc --noEmit (actualmente: 0 errores)
npm run lint        # eslint
npm run db:reset    # Borra, migra y re-siembra la DB demo completa
npm run db:migrate  # Aplica migraciones
npm run db:seed     # Solo siembra
```

---

### 5. Módulos Implementados y Características Clave

#### A. Landing Page Institucional Centenaria (`/`)
- Portada pública institucional para el **Centenario (1926 - 2026)** de Estudiantes de Mercedes.
- Nuevo escudo oficial de básquetbol en alta resolución (`/escudo-estudiantes-basquet-hd.png`).
- Grilla con los **10 Clubes Oficiales de la Liga Regional** con sus escudos.
- Sección de **16 Categorías de Básquetbol Activas** (Escuelita hasta Primera).
- Próximos encuentros con escudos enfrentados y condición Local/Visitante.
- Historia y pilares formativos centenarios.
- Sede oficial en **Calle 33 N° 334** con botón interactivo de **Google Maps**.
- Enlaces directos a Secretaría por WhatsApp y a ClubManager.

#### B. Liga Regional de Básquetbol (10 Clubes Validados)
`src/lib/venues.ts` registra los 10 clubes oficiales con nombres, escudos en `public/escudos/` y navegación GPS:
1. **Club Atlético Estudiantes** (`/escudo-estudiantes-basquet-hd.png` - Calle 33 N° 334, Mercedes) [Anfitrión]
2. **Ateneo de la Juventud** (`/escudos/ateneo.png` - Calle 11 N° 750, Mercedes)
3. **Club Mercedes** (`/escudos/club-mercedes.png` - Av. 29 N° 720, Mercedes)
4. **Club San Carlos** (`/escudos/san-carlos.png` - Ruta 8 y Belgrano, Capitán Sarmiento)
5. **Club Tempestad** (`/escudos/tempestad.png` - Lavalle 450, San Antonio de Areco)
6. **Club Unión Carmeña** (`/escudos/union-carmena.png` - Sarmiento y Rivadavia, Carmen de Areco)
7. **Club Social y Deportivo Costa Brava** (`/escudos/costa-brava.png` - Av. 25 de Mayo 650, Suipacha)
8. **Club Social y Deportivo Coronel Dorrego** (`/escudos/dorrego.png` - Calle 22 N° 550, Navarro)
9. **Club Sarmiento** (`/escudos/sarmiento.png` - Mitre y Alem, Rawson / Chacabuco)
10. **Club Náutico El Timón** (`/escudos/timon.png` - Av. Flandes y Río Luján, Jáuregui, Luján)

#### C. Separación Estricta de Roles (RBAC) y Privacidad
- **Entrenador (`coach`):**
  - **Cero información financiera:** Se eliminaron las pestañas de *Cuotas*, *Pagos*, *Familias* y *Reportes*.
  - En `/app` tiene un **Dashboard Deportivo**: *Jugadores en tu plantel*, *Asistencias*, *Partidos y Fixture*, *Próximos eventos*. No se calculan importes en pesos.
  - En `/app/jugadores` no ve la columna *Deuda* ni enlaces a fichas de familias.
  - En la ficha individual del jugador se ocultó la tarjeta de deuda y la tabla de cuotas.
- **Familia (`guardian`):**
  - Confinada al **Portal Familiar (`/app/portal`)**: saldo exclusivo de sus hijos, botón Mercado Pago, carnets QR y calendario de sus categorías.
- **Admin del Club (`club_admin`):**
  - Acceso total a tesorería, cobro en caja, recibos oficiales, padrones, reportes y comunicados.
- **Superadmin (`platform_admin`):**
  - Panel multi-tenant en `/admin`.

#### D. Apto Médico (EMDAP) y Carnet Digital Independiente de Cuotas
- Carnet Digital en `/app/jugadores/[id]/carnet` y verificación pública en `/verificar/jugador/[id]`.
- **Desvinculación deportiva de deudas:** Se quitó `"Situación de Cuota"` del carnet. El estado de habilitación para jugar (`✓ HABILITADO`) depende exclusivamente del Apto Médico y de estar activo en el padrón, evitando exponer a chicos o familias en cancha.
- Los certificados médicos con aviso próximo a vencer se mantienen legalmente habilitados hasta la fecha de caducidad.

#### E. Partidos, Fixture y Tanteador Final
- `/app/partidos` — Listado con escudos de ambos equipos enfrentados, resultado final, localía y métricas.
- `/app/partidos/nuevo` — Selector visual con los 10 clubes de la liga para autocompletar cancha y GPS.
- `/app/partidos/importar` — Importador masivo de fixture mediante CSV (`/api/plantilla-fixture`).
- `/app/partidos/[id]` — Detalle: tanteador final (`MatchScoreboard`), mapa GPS (`VenueMapCard`), convocatoria del plantel (WhatsApp pre-armado) y botón de suspensión/reactivación.
- `/app/partidos/[id]/planilla` — Planilla oficial A4 imprimible para la mesa de control de la liga.

#### F. Asistencias en Cancha (Mobile-First)
- `/app/asistencias` — Hub con métricas de presentismo y botón `⚡ Iniciar Entrenamiento Ahora`.
- `/app/asistencias/[id]` — Planilla táctil con semáforo EMDAP en vivo y 4 estados (`Presente`, `Tarde`, `Ausente`, `Justificado`).

#### G. Tesorería, Recibos y Refinanciación
- `/app/cuotas` — Facturación, cobros, morosidad y alertas +90 días.
- `/app/pagos/nuevo` — Cobro en caja con imputación automática a cuotas más viejas.
- `/app/pagos/[id]/recibo` — Recibo oficial A4 numerado con QR y sello.
- `/app/cuotas/refinanciar` y `/app/cuotas/convenio` — Simulador de convenios y documento oficial con firmas.
- `/checkout/demo` — Simulador de pago con Mercado Pago.

#### H. Comunicaciones por WhatsApp
- `/app/comunicaciones` — Avisos institucionales con segmentación por audiencia y links prearmados `wa.me`.

#### I. Giras y Viajes Deportivos
- `/app/viajes` y `/app/viajes/[id]` — Hojas de ruta de viajes a torneos, control de butacas y autorizaciones parentales.

#### J. Reportes Ejecutivos para Comisión Directiva
- `/app/reportes` — Tablero directivo con balance de cobranza, morosidad, récord deportivo y auditoría médica EMDAP, exportables a CSV.

---

### 6. Pendientes Reales para Futuras Versiones

1. **Tabla de Posiciones de la Liga de Básquetbol:**
   - Vista en `/app/partidos/posiciones` con la tabla oficial de los 10 clubes (PJ, PG, PP, Puntos, PF, PC, Diferencia).
2. **Estadísticas Individuales de Jugador por Partido:**
   - Carga de puntos individuales (goleadores), faltas (con alerta a las 5 faltas) y elección de MVP.
3. **Despliegue a Producción (Supabase + Netlify):**
   - Configurar base de datos Postgres en Supabase con `DATABASE_URL`.
   - Cargar variables en Netlify (`DATABASE_URL`, `NEXT_PUBLIC_BASE_URL`, tokens de Mercado Pago y WhatsApp).
   - Ejecutar migraciones en la nube.

---

### 7. Convenciones de Trabajo

- **Dirección oficial única:** `Calle 33 N° 334, Mercedes, Buenos Aires` (Sede Histórica de C.A. Estudiantes).
- **Config Next.js:** Mantener siempre **`next.config.mjs`** (no renombrar a `.ts`).
- **Consultas Multi-tenant:** Siempre utilizar `ctx.club.id` en las queries mediante `getTenant()`.
- **TypeScript:** Validar siempre con `npm run typecheck` antes de finalizar tareas (debe mantenerse en 0 errores).
