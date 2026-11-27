import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, NoAccess } from "@/components/ui/page";
import { can, getTenant } from "@/server/tenant";
import { getPlayer } from "@/server/data/people";
import { formatDate, ageFrom } from "@/lib/format";
import { getMedicalCertificateInfo } from "@/lib/medical";

export const metadata = { title: "Carnet Digital de Jugador" };

export default async function PlayerCarnetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "players.view")) return <NoAccess />;

  const { id } = await params;
  const data = await getPlayer(ctx, id);
  if (!data) notFound();

  const { player } = data;

  const medical = getMedicalCertificateInfo(player.medicalCertificateExpiresAt);
  const isEligible = player.status === "active" && (medical.status === "valid" || medical.status === "warning");

  // Generamos un QR con la API oficial segura y rápida de Google Charts / QR Server
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/verificar/jugador/${player.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    verificationUrl
  )}&color=0f172a&bgcolor=ffffff`;

  return (
    <div className="mx-auto max-w-2xl py-2">
      <PageHeader
        title="Carnet Digital Oficial"
        description="Credencial digital habilitante para partidos, torneos y mesa de control."
        backHref={`/app/jugadores/${player.id}`}
        backLabel="Ficha del jugador"
        actions={
          <button
            onClick={undefined}
            className="hidden print:hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-sm transition hover:bg-ink-50"
          >
            Imprimir o Guardar PDF
          </button>
        }
      />

      {/* Carnet Card */}
      <div className="relative mt-6 overflow-hidden rounded-3xl border-2 border-red-700 bg-gradient-to-br from-[#080e1a] via-[#0f1d38] to-[#080e1a] p-6 text-white shadow-2xl">
        {/* Marca de agua sutil de fondo */}
        <div className="pointer-events-none absolute -right-10 -bottom-10 opacity-10">
          <img
            src="/logo-estudiantes-basquet.jpg"
            alt=""
            className="h-72 w-72 rounded-full object-cover"
          />
        </div>

        {/* Encabezado del Carnet */}
        <div className="relative flex items-center justify-between border-b border-white/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-red-600 bg-white shadow-md">
              <img
                src="/logo-estudiantes-basquet.jpg"
                alt="Club Atlético Estudiantes"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-red-500">
                Credencial Deportiva Oficial
              </span>
              <h2 className="text-lg font-black tracking-tight text-white">
                Club Atlético Estudiantes
              </h2>
              <span className="block text-xs font-medium text-slate-300">
                Subcomisión de Básquet · Mercedes (B)
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-full bg-red-600/30 px-3 py-1 text-xs font-bold tracking-wide text-red-400 border border-red-500/40">
              TEMPORADA 2026
            </span>
          </div>
        </div>

        {/* Cuerpo del Carnet */}
        <div className="relative mt-6 grid gap-6 sm:grid-cols-3">
          {/* Columna Izquierda: Foto / Dorsal y Datos Principales */}
          <div className="sm:col-span-2 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-red-800 text-2xl font-black text-white shadow-lg border-2 border-white/20">
                {player.jerseyNumber ? `#${player.jerseyNumber}` : player.firstName[0]}
              </div>
              <div className="min-w-0">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  Jugador Federado
                </span>
                <h3 className="text-xl font-bold text-white truncate">
                  {player.lastName}, {player.firstName}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="rounded bg-white/10 px-2 py-0.5 font-semibold text-white">
                    {player.categoryName ?? "Sin categoría"}
                  </span>
                  <span>DNI {player.dni ?? "—"}</span>
                  {player.birthDate ? <span>· {ageFrom(player.birthDate)} años</span> : null}
                </div>
              </div>
            </div>

            {/* Fila de Datos Adicionales */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-3 text-xs border border-white/10">
              <div>
                <span className="block text-slate-400">Posición</span>
                <span className="font-semibold text-white">{player.position ?? "No asignada"}</span>
              </div>
              <div>
                <span className="block text-slate-400">Grupo Sanguíneo</span>
                <span className="font-semibold text-white">{player.bloodType ?? "—"}</span>
              </div>
              <div className="col-span-2 mt-1">
                <span className="block text-slate-400">Obra Social / Prepaga</span>
                <span className="font-semibold text-white">
                  {player.insuranceProvider ? `${player.insuranceProvider} (${player.insuranceNumber ?? "S/N"})` : "Sin cobertura declarada"}
                </span>
              </div>
            </div>

            {/* Estado de Habilitación Médica y Deportiva */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Apto Médico (EMDAP):</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${medical.badgeClass}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${medical.status === 'valid' ? 'bg-emerald-600' : medical.status === 'warning' ? 'bg-amber-600' : 'bg-rose-600'}`} />
                  {medical.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Estado Deportivo:</span>
                <span className="font-semibold text-emerald-400">
                  {player.status === "active" ? "Activo en Padrón Oficial" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Código QR de Validación Inmediata */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 text-center shadow-lg">
            <span className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Escanear para Validar
            </span>
            <div className="h-36 w-36 overflow-hidden rounded-lg border border-slate-200">
              <img
                src={qrCodeUrl}
                alt="Código QR de Verificación"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="mt-3 w-full">
              <span
                className={`block rounded-lg py-1 text-[11px] font-bold tracking-wide uppercase ${
                  isEligible
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-rose-600 text-white shadow-sm"
                }`}
              >
                {isEligible ? "✓ HABILITADO" : "⚠ NO HABILITADO"}
              </span>
            </div>
          </div>
        </div>

        {/* Pie de Carnet */}
        <div className="relative mt-6 flex flex-wrap items-center justify-between border-t border-white/10 pt-3 text-[11px] text-slate-400">
          <span>Identificador Único: {player.id.slice(0, 8).toUpperCase()}</span>
          <span>Club Atlético Estudiantes · Afiliado a Liga Regional</span>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link
          href={`/app/jugadores/${player.id}`}
          className="rounded-lg bg-ink-900 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-800 transition shadow"
        >
          Volver a la Ficha del Jugador
        </Link>
      </div>
    </div>
  );
}
