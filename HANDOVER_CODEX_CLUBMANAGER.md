# 🏀 CLUBMANAGER — SaaS de Gestión Integral de Clubes Deportivos
## Handover / Contexto para Continuidad del Desarrollo

> **Última actualización:** 26/11/2026 — reescrito contra el código real.
> La versión anterior estaba desactualizada: listaba como pendientes el módulo de
> partidos y el centro de comunicados, que ya están implementados.

---

### 1. Resumen Ejecutivo y Cliente Objetivo

- **Producto:** SaaS multitenant para la gestión deportiva, médica, financiera y comunicacional de clubes deportivos.
- **Cliente Demo Target:** **Club Atlético Estudiantes de Mercedes (Buenos Aires)** — básquetbol, **Centenario (1926-2026)**. Sede: Calle 33 N° 334, Mercedes (B).
- **Objetivo:** MVP hiper-pulido y funcional para presentar ante la Comisión Directiva.
- **Estado:** MVP funcional en local. `npm run typecheck` pasa limpio. **Todo el trabajo nuevo está sin commitear** (ver §3).

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
- **Permisos:** `src/lib/permissions.ts` (roles `platform_admin`, `club_admin`, `coach`, `guardian`, `player`). Se valida con `can(ctx, "permiso")` en cada página/action.
- **Planes:** el plan del club habilita módulos (`module: "jugadores" | "cuotas" | "deportivo" | "comunicaciones" | "reportes"`); los ítems de nav se ocultan si el plan no incluye el módulo.
- **Config Next:** usar siempre **`next.config.mjs`**. No renombrar a `.ts` (bug de canonicalización de rutas en Windows con Turbopack/SWC). El `next.config.ts` fue eliminado.
- **DB client:** `src/db/client.ts` usa `DATABASE_URL` si existe; si no, PGlite en `.data/pglite` (en `production` cae a `/tmp/clubmanager-pglite` para serverless).
- **Marca:** paleta roja institucional (`--color-brand-*` de `#dc2626` a `#7f1d1d`), azul marino/ink, blanco y dorado centenario en `src/app/globals.css`.

---

### 3. Estado del Repositorio (LEER ANTES DE TOCAR NADA)

- **Repo:** `https://github.com/panchito49-cloud/clubmanager.git` — branch `main`.
- **70 archivos modificados/nuevos SIN COMMITEAR.** El último commit es `36a318a fix: use /tmp directory for pglite fallback in serverless`.
- Archivos sin trackear que contienen funcionalidad completa: `asistencias/`, `portal/`, `carnet/`, `recibo/`, `convenio/`, `refinanciar/`, `verificar/`, `checkout/`, `planilla/`, `partidos/importar/`, `components/attendance/`, `components/portal/`, `components/comms/`, `components/sports/`, `lib/medical.ts`, `lib/venues.ts`, `lib/whatsapp-link.ts`, `server/data/portal.ts`, migración `drizzle/0003_curvy_whirlwind.sql` y sus snapshots.
- **Riesgo:** cualquier `git checkout/reset` o pérdida del disco borra el MVP. Netlify deploya desde `main`, así que **sin commit no hay demo publicable**.
- **Acción pendiente #0:** commit + push antes de cualquier feature nueva.

---

### 4. Credenciales de Acceso (Entorno Local Demo)

- **URL:** `http://localhost:3000/login`
- **Slug del club demo:** `barrio-norte-demo` (el nombre visible es "Club Atlético Estudiantes"; el slug conserva el nombre viejo — inconsistencia conocida, no rompe nada).

| Rol | Usuario | Clave |
|---|---|---|
| Superadmin plataforma | `admin@clubmanager.app` | `CambiarEstaClave123!` |
| Admin del club | `admin@barrio-norte.demo` | `Demo2026!` |
| Admin alterno (Estudiantes) | `administracion@caestudiantes.demo` | `Demo2026!` |
| Entrenador | `martin.ferreyra@barrio-norte.demo` | `Demo2026!` |
| Entrenadora | `lucia.benitez@barrio-norte.demo` | `Demo2026!` |
| Tutor | `carla.gomez@barrio-norte.demo` | `Demo2026!` |
| Jugador | `tomas.gomez@barrio-norte.demo` | `Demo2026!` |

Los emails del seed pueden sobreescribirse con `SEED_PLATFORM_ADMIN_EMAIL` / `SEED_PLATFORM_ADMIN_PASSWORD`.

**Comandos**

```bash
npm run dev         # servidor local (Turbopack)
npm run typecheck   # tsc --noEmit  (hoy: OK)
npm run lint        # eslint
npm run db:reset    # borra, migra y re-siembra la DB demo
npm run db:generate # genera migración desde el schema
npm run db:migrate  # aplica migraciones (usa DATABASE_URL si existe)
npm run db:seed     # solo siembra
```

---

### 5. Módulos Implementados (verificados en código)

#### A. Panel, identidad y navegación
- `/app` — Panel con cobranza de los últimos meses, familias con deuda, próximos eventos y alertas (pagos a revisar).
- Shell con escudo centenario (`/escudo-estudiantes-centenario.jpg`) y logo básquet (`/logo-estudiantes-basquet.jpg`).
- Nav por secciones: Gestión, Economía, Deportivo, Comunicación, Administración (`src/components/app/nav-items.ts`).

#### B. Jugadores, familias y categorías
- `/app/jugadores` (listado + métricas), `/app/jugadores/[id]`, `/app/jugadores/[id]/carnet`.
- `/app/jugadores/importar` — importador CSV con plantilla descargable en `/api/plantilla-jugadores`.
- `/app/familias`, `/app/familias/[id]`.
- `/app/categorias` — **16 categorías** de básquet (8 masculinas + 8 femeninas: Escuelita, Pre-mini, Mini, U13, U15, U17, U21, Primera).
- Avatares circulares con dorsal o iniciales; alta/edición vía `player-form.tsx` y actions de `people.ts`.

#### C. Apto médico (EMDAP), carnet digital y verificación pública
- Campo `medicalCertificateExpiresAt` en `players` (migración `0003_curvy_whirlwind.sql`).
- `src/lib/medical.ts` — semáforo: *Vigente*, *Por vencer (30 d)*, *Vencido*, *Sin apto*.
- Carnet en `/app/jugadores/[id]/carnet` con diseño Centenario, dorsal, seguro y habilitación.
- **QR** que apunta a `/verificar/jugador/[id]` (público, sin login, para planilleros y árbitros).
- Botón WhatsApp institucional (`src/components/app/whatsapp-button.tsx`, formato `+54 9…`).

#### D. Planilla oficial de partido (Lista de Buena Fe)
- `/app/partidos/[id]/planilla` — A4 imprimible, 12 jugadores, DNI, dorsal, nacimiento, posición, apto y línea de firma; firmas de DT, delegado, árbitro y comisionado.

#### E. Finanzas
- `/app/cuotas` — facturado, cobrado (% en vivo), deuda vencida, descuentos (hermanos/becas) y alerta de mora +90 días.
- `/app/pagos` — historial; `/app/pagos/nuevo` — cobro en caja con selector de familia, cálculo de deuda en vivo, imputación a cuotas más antiguas (`allocateOldestFirst`) y recibo inmediato.
- `/app/pagos/[id]/recibo` — recibo oficial de tesorería, numeración `REC-2026-…`, QR de autenticidad, sello, impresión A4 y WhatsApp al tutor.
- **Mercado Pago:** botón Pagar en cuotas + `/checkout/demo` (simulador que aprueba, imputa y emite recibo). API real en `src/app/api/payments/create` y `webhook`.
- **Refinanciación de mora:** `/app/cuotas/refinanciar` (quita 0–30 %, 2–12 cuotas, simulador en vivo) y `/app/cuotas/convenio` (convenio oficial con cláusula de continuidad deportiva y firmas).

#### F. Portal del Tutor / Familia
- `/app/portal` — vista mobile-first y preview admin para rol `guardian`.
- Mis hijos + carnets, saldo consolidado, pago en 1 clic con MP, historial de recibos, calendario filtrado por categorías de los hijos y contacto de secretaría.
- Lógica en `src/server/data/portal.ts` + `src/components/portal/guardian-portal.tsx`.

#### G. Asistencias (mobile-first para entrenadores)
- `/app/asistencias` — hub con lanzador `⚡ Iniciar Entrenamiento Ahora`, métricas de presentismo del mes y sesiones recientes con `📋 Tomar Lista`.
- `/app/asistencias/[id]` — planilla táctil: alerta EMDAP en vivo, 4 estados (`Presente`, `Tarde`, `Ausente`, `Justificado`), actualización optimista, observaciones inline, `⚡ Todos presentes` y `✓ Finalizar sesión`.
- Componente: `src/components/attendance/attendance-sheet.tsx`.

#### H. Partidos, fixture y convocatoria
- `/app/partidos` — listado con resultado (victoria/derrota/diferencia) y métricas.
- `/app/partidos/nuevo` — alta de partido (rival, categoría, fecha, local/visitante, sede).
- `/app/partidos/importar` — importación masiva de fixture desde CSV (`/api/plantilla-fixture`).
- `/app/partidos/[id]` — detalle: **tanteador final** (`ourScore`/`rivalScore`, `MatchScoreboard`), mapa/GPS de cancha (`VenueMapCard`), convocatoria (callups: invitar/confirmar/quitar) y suspender/reactivar.
- `/app/partidos/[id]/planilla` — planilla A4.
- `/app/calendario` (+ `/nuevo`, `/[id]`) — entrenamientos y eventos.

#### I. Centro de Comunicaciones por WhatsApp
- `/app/comunicaciones` — métricas (total, familias alcanzadas, emitidos) y listado.
- `/app/comunicaciones/nueva` — `AnnouncementComposer`: plantillas rápidas (convocatoria, apto médico, etc.), segmentación por audiencia (`all`, `coaches`, `families`, `players`, `category` con género) y generación de enlace WhatsApp pre-armado.
- `/app/comunicaciones/[id]` — detalle.
- Datos: `src/server/data/comms.ts`; tablas `announcements`, `notifications`, `messageTemplates`, `messageOutbox`, `whatsappOptOuts`, `messageConsents`, `integrations`.

#### J. Reportes
- `/app/reportes` — récord deportivo de básquet, control sanitario EMDAP, presentismo y cobranzas.
- Exportación CSV/descarga vía `/api/reportes/[tipo]`.

#### K. Viajes
- `/app/viajes`, `/app/viajes/[id]` — viajes de categoría o asociados a un partido, con pasajeros (`tripPassengers`).

#### L. Administración y plataforma
- `/app/usuarios` (staff), `/app/configuracion` (datos del club).
- `/admin` — resumen, `/admin/clubes`, `/admin/planes`, `/admin/usuarios` (superadmin).
- Auth: `/login`, `/recuperar`, `/restablecer`, `/seleccionar-club`, `/sin-club`, `/club-suspendido`.
- Auditoría: tabla `auditLogs`; sesiones con cookie httpOnly/secure en producción.

---

### 6. Modelo de Datos (Drizzle)

`src/db/schema/` — 7 archivos, 34 tablas:

| Archivo | Tablas |
|---|---|
| `core.ts` | `plans`, `clubs`, `subscriptions`, `subscriptionEvents`, `users`, `sessions`, `memberships`, `passwordResetTokens`, `auditLogs` |
| `people.ts` | `categories`, `coachCategories`, `families`, `familyMembers`, `players`, `playerEvents`, `playerDiscounts` |
| `finance.ts` | `feePlans`, `charges`, `payments`, `paymentApplications` |
| `sports.ts` | `trainings`, `attendance`, `matches`, `callups`, `trips`, `tripPassengers` |
| `comms.ts` | `announcements`, `notifications`, `messageTemplates`, `integrations`, `messageConsents`, `messageOutbox`, `whatsappOptOuts` |
| `files.ts` | `documents` |

**`matches` hoy tiene:** `rival`, `startsAt`, `location`, `isHome`, `status`, `ourScore`, `rivalScore`, `notes`.
**No tiene:** cuartos, estadísticas individuales, tabla de posiciones.

---

### 7. Pendientes Reales (priorizados)

#### P0 — Commit + push (bloqueante operativo)
70 archivos sin versionar. Agrupar en commits lógicos (schema+migración, finanzas, asistencias, portal, partidos, comms, assets) y pushear a `origin/main`.

#### P1 — Completar el módulo de partidos (único hueco funcional para la demo)
1. **Tanteador por cuartos (Q1–Q4):** nueva tabla `match_quarters` (`matchId`, `quarter`, `ourScore`, `rivalScore`) o columnas JSON; UI en `MatchScoreboard` con carga por cuarto y total derivado.
2. **Goleadores y faltas individuales:** nueva tabla `match_player_stats` (`matchId`, `playerId`, `points`, `fouls`, `minutes`, `isMvp`); carga rápida desde el detalle del partido; **alerta visual al llegar a 5 faltas**; resumen en el detalle y en reportes.
3. **Tabla de posiciones / fixture de temporada:** cálculo de PJ, PG, PP, puntos a favor/en contra y diferencia por categoría; vista `/app/partidos/tabla` o pestaña en `/app/partidos`, filtrable por categoría y torneo.
4. Opcional: torneo/fase (`competition`) para separar liga, copa y amistosos.

#### P2 — Despliegue a producción (Supabase + Netlify)
1. Crear proyecto Postgres en Supabase y obtener `DATABASE_URL` (con SSL).
2. `DATABASE_URL=... npm run db:migrate` y luego `npm run db:seed` (opcional para datos demo).
3. En Netlify configurar: `DATABASE_URL`, `NEXT_PUBLIC_BASE_URL`, `MERCADO_PAGO_ACCESS_TOKEN`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (ver `.env.example` y `netlify.toml`).
4. Cambiar visibilidad del sitio a *Public* y desplegar desde `main` (plugin `@netlify/plugin-nextjs` ya configurado).
5. Verificar que PGlite no se use en prod: `src/db/client.ts` prioriza `DATABASE_URL` y cae a `/tmp` solo si falta.
6. Nota: Netlify no provee filesystem persistente; sin `DATABASE_URL` la app arranca con PGlite vacío en `/tmp`. **`DATABASE_URL` es obligatoria en prod.**

#### P3 — Integraciones y calidad
- Reemplazar tokens placeholder de WhatsApp Cloud API y Mercado Pago por credenciales reales (sandbox primero) y probar webhook `api/payments/webhook`.
- No hay tests automatizados (ni unitarios ni e2e). Como mínimo: smoke test de los flujos demo (login por rol, cobro, recibo, carnet, asistencia, comunicado).
- Inconsistencia de naming: slug `barrio-norte-demo` para el club Estudiantes; considerar migrar a `caestudiantes` antes de producción.
- `HANDOVER_CODEX_CLUBMANAGER.md` está untracked: commitearlo junto con el resto.

---

### 8. Mapa de Rutas y Archivos Clave

**Datos / server**
- `src/db/client.ts` — selección PGlite vs Postgres.
- `src/db/schema/*` — modelo completo.
- `src/server/tenant.ts` — contexto de club + permisos (`getTenant`, `can`).
- `src/server/data/` — `dashboard.ts`, `people.ts`, `finance.ts`, `sports.ts`, `comms.ts`, `reports.ts`, `portal.ts`, `users.ts`, `admin.ts`.
- `src/app/actions/` — `auth.ts`, `people.ts`, `finance.ts`, `sports.ts`, `comms.ts`, `users.ts`, `admin.ts`, `club.ts`.

**Páginas nuevas / destacadas**
- `src/app/app/asistencias/{page,[id]}` + `src/components/attendance/attendance-sheet.tsx`
- `src/app/app/portal/page.tsx` + `src/components/portal/guardian-portal.tsx`
- `src/app/app/jugadores/[id]/carnet/page.tsx` + `src/app/verificar/jugador/[id]/page.tsx`
- `src/app/app/pagos/nuevo/page.tsx` + `src/components/app/family-payment-selector.tsx`
- `src/app/app/pagos/[id]/recibo/page.tsx`
- `src/app/app/cuotas/refinanciar/page.tsx` + `src/components/app/refinancing-calculator.tsx`
- `src/app/app/cuotas/convenio/page.tsx`
- `src/app/app/partidos/{page,nuevo,importar,[id],[id]/planilla}` + `src/components/sports/{match-scoreboard,venue-map-card}.tsx`
- `src/app/app/comunicaciones/{page,nueva,[id]}` + `src/components/comms/announcement-composer.tsx`
- `src/app/checkout/demo/page.tsx`

**APIs**
- `src/app/api/payments/{create,webhook}/route.ts`
- `src/app/api/plantilla-jugadores/route.ts`, `src/app/api/plantilla-fixture/route.ts`
- `src/app/api/reportes/[tipo]/route.ts`

**Scripts / deploy**
- `scripts/{seed,migrate,reset}.ts`
- `netlify.toml`, `NETLIFY_DEPLOY.md`, `deploy-netlify.bat`, `push-to-github.bat`, `start-local.bat`
- `next.config.mjs` (no convertir a `.ts`)

---

### 9. Convenciones de Trabajo

- Toda query de datos de club filtra por `ctx.club.id`; nunca confiar en IDs del request sin validar pertenencia.
- Server Actions devuelven/redirigen con `?ok=` / `?error=` y las páginas usan `<Flash />`.
- Las páginas validan permiso al inicio (`if (!can(ctx, "x")) return <NoAccess />`).
- UI: componentes de `src/components/ui/*` (Card, Table, Badge, Button, Select, Icon, PageHeader, Flash, Alert).
- Español rioplatense en toda la copy; fechas con `src/lib/format.ts`.
- Antes de tocar código de Next.js, revisar `node_modules/next/dist/docs/` (esta versión tiene breaking changes respecto de versiones anteriores).
