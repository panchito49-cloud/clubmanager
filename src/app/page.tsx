import Link from "next/link";
import Image from "next/image";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, matches } from "@/db/schema";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { getAuth } from "@/server/auth";
import { HOME_VENUE, LEAGUE_CLUBS, getTeamBadge } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const auth = await getAuth().catch(() => null);

  // Consultar categorías y próximos partidos de básquet
  const [dbCategories, upcomingMatches] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder))
      .catch(() => []),
    db
      .select()
      .from(matches)
      .orderBy(asc(matches.startsAt))
      .limit(4)
      .catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-ink-950 text-white selection:bg-brand-600 selection:text-white font-sans">
      {/* HEADER INSTITUCIONAL CENTENARIO */}
      <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="relative h-13 w-13 sm:h-14 sm:w-14 overflow-hidden rounded-full border-2 border-amber-400/40 bg-white p-1 shadow-md transition group-hover:scale-105 group-hover:border-amber-400">
              <Image
                src="/escudo-estudiantes-basquet-hd.png"
                alt="Club Atlético Estudiantes Básquet Mercedes"
                fill
                priority
                className="object-contain p-0.5"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white uppercase group-hover:text-amber-400 transition">
                  Estudiantes
                </span>
                <span className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-ink-950 shadow-xs">
                  1926 · 2026
                </span>
              </div>
              <p className="text-[11px] font-semibold text-brand-400 tracking-wide uppercase">
                Básquetbol · Mercedes (Buenos Aires)
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="#historia"
              className="hidden md:block rounded-xl px-3 py-2 text-xs font-bold text-ink-300 hover:text-white hover:bg-ink-900 transition"
            >
              El Club
            </Link>
            <Link
              href="#categorias"
              className="hidden sm:block rounded-xl px-3 py-2 text-xs font-bold text-ink-300 hover:text-white hover:bg-ink-900 transition"
            >
              Básquet Formativo
            </Link>
            <Link
              href="#liga"
              className="hidden lg:block rounded-xl px-3 py-2 text-xs font-bold text-ink-300 hover:text-white hover:bg-ink-900 transition"
            >
              Liga de Clubes
            </Link>
            <Link
              href="#sede"
              className="hidden sm:block rounded-xl px-3 py-2 text-xs font-bold text-ink-300 hover:text-white hover:bg-ink-900 transition"
            >
              Sede & GPS
            </Link>

            {auth ? (
              <ButtonLink
                href={auth.clubId ? "/app" : "/admin"}
                size="sm"
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
              >
                Panel de Gestión
              </ButtonLink>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-ink-700 bg-ink-900/80 px-3.5 py-2 text-xs font-bold text-white hover:bg-ink-800 transition"
                >
                  Portal Familias
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:from-brand-500 hover:to-brand-600 transition"
                >
                  Acceso Staff
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* HERO SECTION CENTENARIO */}
        <section className="relative overflow-hidden border-b border-ink-800 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950 py-16 sm:py-24">
          {/* Luces decorativas */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-600/15 blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 right-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300 shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  Rumbo al Centenario Institucional · 1926 - 2026
                </div>

                <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.08]">
                  Cuna del Básquet Mercedino.{" "}
                  <span className="bg-gradient-to-r from-brand-500 via-red-500 to-amber-400 bg-clip-text text-transparent">
                    100 Años de Pasión y Formación.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-ink-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Bienvenidos al sitio oficial del <strong>Club Atlético Estudiantes de Mercedes</strong>.
                  Una institución pionera en el desarrollo deportivo, contención familiar y
                  competencia formativa en el corazón de Mercedes, Buenos Aires.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-brand-600/30 hover:from-brand-500 hover:to-brand-600 transition"
                  >
                    🏀 Ingresar al ClubManager
                  </Link>
                  <a
                    href="https://wa.me/5492324505050?text=Hola!%20Quisiera%20consultar%20información%20e%20inscripciones%20para%20Básquetbol%20en%20Club%20Estudiantes."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
                  >
                    💬 Contactar por WhatsApp
                  </a>
                </div>

                {/* Sede oficial */}
                <div className="pt-4 flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-ink-400">
                  <span>📍</span>
                  <span>Sede Histórica & Estadio Centenario:</span>
                  <span className="text-white font-bold">{HOME_VENUE.address}, Mercedes (B)</span>
                </div>
              </div>

              {/* Escudo Gigante Destacado */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-brand-600 to-amber-500 opacity-20 blur-2xl group-hover:opacity-30 transition" />
                  <div className="relative h-64 w-64 sm:h-80 sm:w-80 rounded-full border-4 border-amber-400/50 bg-ink-900/90 p-4 shadow-2xl flex items-center justify-center backdrop-blur-sm">
                    <Image
                      src="/escudo-estudiantes-basquet-hd.png"
                      alt="Club Atlético Estudiantes Básquetbol"
                      width={280}
                      height={280}
                      priority
                      className="h-auto w-auto object-contain drop-shadow-xl"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                      ★ Club Atlético Estudiantes ★
                    </p>
                    <p className="text-[11px] text-ink-400">Mercedes (Buenos Aires) · Afiliado Oficial</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 10 CLUBES OFICIALES DE LA LIGA */}
        <section id="liga" className="border-b border-ink-800 bg-ink-900/50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Torneo Oficial de Básquetbol
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Liga Regional · 10 Clubes Participantes
              </h2>
              <p className="text-xs sm:text-sm text-ink-400 max-w-xl mx-auto">
                Estudiantes compite activamente frente a las instituciones más representativas de la zona:
              </p>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              {LEAGUE_CLUBS.map((club) => {
                const isHome = club.id === "estudiantes";
                return (
                  <div
                    key={club.id}
                    className={`flex flex-col items-center justify-center rounded-2xl p-4 border text-center transition ${
                      isHome
                        ? "border-amber-400/60 bg-gradient-to-b from-brand-950/60 to-ink-900 shadow-md ring-1 ring-amber-400/40"
                        : "border-ink-800 bg-ink-900/60 hover:bg-ink-850 hover:border-ink-700"
                    }`}
                  >
                    <div className="relative h-16 w-16 mb-2.5 overflow-hidden rounded-full border border-ink-700 bg-white p-1 shadow-sm">
                      <Image
                        src={club.badgeUrl}
                        alt={club.name}
                        fill
                        className="object-contain p-0.5"
                      />
                    </div>
                    <h3 className={`text-xs font-extrabold line-clamp-1 ${isHome ? "text-amber-400" : "text-white"}`}>
                      {club.shortName}
                    </h3>
                    <p className="text-[10px] text-ink-400 line-clamp-1">{club.city}</p>
                    {isHome && (
                      <span className="mt-1.5 rounded-full bg-brand-600/30 px-2 py-0.5 text-[9px] font-black uppercase text-brand-300 border border-brand-500/30">
                        Anfitrión
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BÁSQUET FORMATIVO & CATEGORÍAS */}
        <section id="categorias" className="border-b border-ink-800 py-16 sm:py-20 bg-ink-950">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-3xl space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-500">
                Tira Completa Masculina y Femenina
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                16 Categorías de Básquetbol Activas
              </h2>
              <p className="text-sm text-ink-300">
                Desde los primeros pasos en Escuelita y Mini Básquet hasta la Primera División.
                Un proceso formativo integral con entrenadores certificados, seguro deportivo
                y seguimiento médico oficial (EMDAP).
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "Escuelita & Pre-Mini", age: "4 a 9 años", desc: "Iniciación lúdica, coordinación y valores de equipo.", tag: "Masc / Fem" },
                { name: "Mini Básquet", age: "10 a 12 años", desc: "Fundamentos técnicos, pase, dribling y juego colectivo.", tag: "Masc / Fem" },
                { name: "Formatívas U13 & U15", age: "13 a 15 años", desc: "Inicio de competencia oficial, táctica y preparación física.", tag: "Masc / Fem" },
                { name: "Juveniles U17 & U21", age: "16 a 21 años", desc: "Alta competencia de la liga, proyección y entrenamientos intensivos.", tag: "Masc / Fem" },
              ].map((c) => (
                <div key={c.name} className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5 space-y-2 hover:border-brand-500/40 transition">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-brand-600/20 px-2 py-0.5 text-[10px] font-bold text-brand-400 border border-brand-500/20">
                      {c.tag}
                    </span>
                    <span className="text-xs text-ink-400 font-semibold">{c.age}</span>
                  </div>
                  <h3 className="text-base font-bold text-white pt-1">{c.name}</h3>
                  <p className="text-xs text-ink-400 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            {/* Mención especial Primera División */}
            <div className="mt-6 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-950/40 via-ink-900 to-ink-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-base font-extrabold text-white">
                  🏀 Primera División (Plantel Superior Masculino y Femenino)
                </h4>
                <p className="text-xs text-ink-400">
                  Disputando el campeonato oficial de la liga en el Estadio Centenario de Calle 33 N° 334.
                </p>
              </div>
              <Link
                href="/login"
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-500 transition flex-shrink-0"
              >
                Ver Fixture y Convocatorias
              </Link>
            </div>
          </div>
        </section>

        {/* FIXTURE RECIENTE / DESTACADO */}
        {upcomingMatches.length > 0 && (
          <section className="border-b border-ink-800 bg-ink-900/40 py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Calendario Oficial
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    Próximos Encuentros de la Liga
                  </h2>
                </div>
                <Link
                  href="/login"
                  className="text-xs font-bold text-brand-400 hover:text-brand-300 underline"
                >
                  Ver fixture completo en ClubManager →
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {upcomingMatches.map((m) => {
                  const rivalBadge = getTeamBadge(m.rival);
                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-ink-800 bg-ink-900 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-brand-400">
                          {m.isHome ? "Local en Calle 33" : "Visitante"}
                        </span>
                        <span className="text-ink-400">{formatDateTime(m.startsAt)}</span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-y border-ink-800">
                        {/* Estudiantes */}
                        <div className="flex items-center gap-2">
                          <div className="relative h-8 w-8 overflow-hidden rounded-full border border-ink-700 bg-white flex-shrink-0">
                            <Image
                              src="/escudo-estudiantes-basquet-hd.png"
                              alt="Estudiantes"
                              fill
                              className="object-contain p-0.5"
                            />
                          </div>
                          <span className="text-xs font-bold text-white">Estudiantes</span>
                        </div>

                        <span className="text-xs font-black text-ink-500">VS</span>

                        {/* Rival */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate max-w-[80px]">
                            {m.rival}
                          </span>
                          <div className="relative h-8 w-8 overflow-hidden rounded-full border border-ink-700 bg-white flex-shrink-0">
                            <Image
                              src={rivalBadge}
                              alt={m.rival}
                              fill
                              className="object-contain p-0.5"
                            />
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-ink-400 truncate">
                        📍 {m.location || "Estadio Centenario"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* HISTORIA Y VALORES CENTENARIOS */}
        <section id="historia" className="border-b border-ink-800 py-16 sm:py-20 bg-ink-950">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div className="space-y-5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Centenario 1926 - 2026
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  Un Siglo Forjando Jóvenes a Través del Deporte
                </h2>
                <p className="text-sm text-ink-300 leading-relaxed">
                  Fundado el 15 de marzo de 1926, el <strong>Club Atlético Estudiantes</strong> nació
                  del entusiasmo de jóvenes mercedinos con vocación de encuentro, camaradería
                  y superación deportiva.
                </p>
                <p className="text-sm text-ink-300 leading-relaxed">
                  A lo largo de 100 años de trayectoria ininterrumpida, nuestra institución se ha
                  consolidado como un referente indiscutido del básquetbol regional, albergando
                  a múltiples generaciones de jugadores que aprendieron en nuestra cancha los valores
                  del respeto, el esfuerzo compartido y el amor por los colores rojo y negro.
                </p>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-3.5 text-center">
                    <p className="text-2xl font-black text-amber-400">100</p>
                    <p className="text-[11px] text-ink-400 font-semibold">Años de Historia</p>
                  </div>
                  <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-3.5 text-center">
                    <p className="text-2xl font-black text-white">16</p>
                    <p className="text-[11px] text-ink-400 font-semibold">Categorías</p>
                  </div>
                  <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-3.5 text-center">
                    <p className="text-2xl font-black text-brand-500">+350</p>
                    <p className="text-[11px] text-ink-400 font-semibold">Familias Activas</p>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Valores */}
              <div className="rounded-3xl border border-ink-800 bg-gradient-to-br from-ink-900 to-ink-950 p-7 sm:p-9 space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🏆</span> Pilares de Nuestra Formación
                </h3>

                <div className="space-y-4 text-xs text-ink-300">
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400 font-bold">1</span>
                    <div>
                      <p className="font-bold text-white text-sm">Formación Humana Antes que Deportiva</p>
                      <p className="mt-0.5 text-ink-400">Priorizamos la educación, la amistad y el compañerismo por encima de cualquier resultado de tabla.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-bold">2</span>
                    <div>
                      <p className="font-bold text-white text-sm">Acompañamiento a las Familias</p>
                      <p className="mt-0.5 text-ink-400">Integración permanente de padres y tutores en la vida social, viajes y eventos del club.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold">3</span>
                    <div>
                      <p className="font-bold text-white text-sm">Gestión Moderna y Transparente</p>
                      <p className="mt-0.5 text-ink-400">Con ClubManager, cada familia tiene su carnet digital con QR, cuotas al día y aviso directo por WhatsApp.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEDE SOCIAL & GOOGLE MAPS GPS */}
        <section id="sede" className="py-16 sm:py-20 bg-ink-900/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-3xl border border-ink-800 bg-ink-900 p-6 sm:p-10 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Ubicación Oficial
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Estadio Centenario - Cancha 1
                  </h2>
                  <p className="text-xs text-ink-400">
                    Sede Social y Cancha de Básquetbol del Club Atlético Estudiantes de Mercedes
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(HOME_VENUE.googleMapsQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition"
                  >
                    🚗 ¿Cómo llegar con Google Maps?
                  </a>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 text-xs">
                <div className="rounded-2xl border border-ink-800 bg-ink-950 p-4 space-y-1">
                  <p className="font-bold text-white text-sm">📍 Dirección Exacta</p>
                  <p className="text-ink-300 font-semibold">{HOME_VENUE.address}</p>
                  <p className="text-ink-500">{HOME_VENUE.city}, {HOME_VENUE.province}</p>
                </div>

                <div className="rounded-2xl border border-ink-800 bg-ink-950 p-4 space-y-1">
                  <p className="font-bold text-white text-sm">⏰ Horarios de Secretaría</p>
                  <p className="text-ink-300">Lunes a Viernes de 16:00 a 21:00 hs</p>
                  <p className="text-ink-500">Sábados de fecha de Liga: desde 09:00 hs</p>
                </div>

                <div className="rounded-2xl border border-ink-800 bg-ink-950 p-4 space-y-1">
                  <p className="font-bold text-white text-sm">📱 Secretaría WhatsApp</p>
                  <p className="text-emerald-400 font-semibold">+54 9 2324 50-5050</p>
                  <p className="text-ink-500">Atención a socios y trámites de cuotas</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER INSTITUCIONAL */}
      <footer className="border-t border-ink-800 bg-ink-950 py-10 text-xs text-ink-500">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-full border border-ink-700 bg-white">
              <Image
                src="/escudo-estudiantes-basquet-hd.png"
                alt="Escudo"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <div>
              <p className="text-ink-300 font-bold">Club Atlético Estudiantes de Mercedes</p>
              <p className="text-[11px] text-ink-500">Centenario 1926 - 2026 · Mercedes, Buenos Aires</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/login" className="hover:text-white transition">
              Portal Familias
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Acceso Entrenadores
            </Link>
            <Link href="/verificar" className="hover:text-white transition">
              Verificar Carnet QR
            </Link>
            <span className="text-ink-700">|</span>
            <span className="text-ink-600">Powered by ClubManager SaaS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
