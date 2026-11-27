import { notFound } from "next/navigation";
import Link from "next/link";
import { can, getTenant } from "@/server/tenant";
import { getMatch } from "@/server/data/sports";
import { formatDateTime, formatDate, ageFrom } from "@/lib/format";
import { getMedicalCertificateInfo } from "@/lib/medical";

export const metadata = { title: "Planilla Oficial de Juego - Mesa de Control" };

export default async function MatchScoreSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "matches.view")) return notFound();

  const { id } = await params;
  const data = await getMatch(ctx, id);
  if (!data) notFound();

  const { match, players } = data;

  // Filtramos los jugadores convocados (o todos los disponibles si no se convocó ninguno formalmente)
  const roster = players.filter((p) => p.callupStatus !== null);
  const activePlayers = roster.length > 0 ? roster : players;

  // Ordenamos por número de camiseta (dorsal) ascendente, y si no tienen al final
  const sortedPlayers = [...activePlayers].sort((a, b) => {
    if (a.jerseyNumber && b.jerseyNumber) return a.jerseyNumber - b.jerseyNumber;
    if (a.jerseyNumber) return -1;
    if (b.jerseyNumber) return 1;
    return a.lastName.localeCompare(b.lastName);
  });

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white text-slate-900">
      {/* Barra de acción flotante (no se imprime) */}
      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-200 print:hidden">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Planilla Oficial de Partido · Mesa de Control
          </h2>
          <p className="text-xs text-slate-500">
            Formato reglamentario A4 para entregar a la mesa de control y árbitros.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/app/partidos/${match.id}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            ← Volver al partido
          </Link>
          <button
            onClick={undefined}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-red-700 transition"
          >
            🖨️ Imprimir Planilla (Ctrl + P)
          </button>
        </div>
      </div>

      {/* Hoja A4 Oficial */}
      <div className="mx-auto w-full max-w-[210mm] bg-white p-8 shadow-xl border border-slate-300 print:border-none print:shadow-none print:p-4 print:max-w-none">
        {/* Cabecera Oficial del Club */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-red-700 bg-white">
              <img
                src="/logo-estudiantes-basquet.jpg"
                alt="Club Atlético Estudiantes"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <span className="block text-[11px] font-bold tracking-widest text-red-700 uppercase">
                Asociación / Liga de Básquetbol
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                Club Atlético Estudiantes
              </h1>
              <span className="block text-xs font-semibold text-slate-600">
                Subcomisión de Básquetbol · Mercedes (Bs. As.) · Fundado en 1926
              </span>
            </div>
          </div>
          <div className="text-right border-l-2 border-slate-200 pl-4">
            <span className="block rounded bg-slate-900 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
              LISTA DE BUENA FE
            </span>
            <span className="mt-1 block text-xs font-bold text-red-600">
              Categoría {match.categoryName} ({match.categoryGender === "male" ? "Masc." : "Fem."})
            </span>
          </div>
        </div>

        {/* Ficha de Partido */}
        <div className="my-4 grid grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
          <div>
            <span className="block font-semibold text-slate-500 uppercase">Encuentro:</span>
            <span className="font-extrabold text-slate-900">
              Estudiantes vs. {match.rival}
            </span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase">Fecha y Hora:</span>
            <span className="font-bold text-slate-900">{formatDateTime(match.startsAt)}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase">Condición:</span>
            <span className="font-bold text-slate-900">
              {match.isHome ? "Local (Mercedes)" : `Visitante (${match.location ?? "Cancha rival"})`}
            </span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase">Entrenador (DT):</span>
            <span className="font-bold text-slate-900">{match.coachName ?? "Martín Ferreyra"}</span>
          </div>
        </div>

        {/* Tabla Oficial de Jugadores */}
        <div className="mt-4">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y-2 border-slate-900 bg-slate-100 text-[11px] font-black uppercase text-slate-900">
                <th className="py-2 px-2 text-center w-12 border-r border-slate-300">N°</th>
                <th className="py-2 px-3 border-r border-slate-300">Apellido y Nombre</th>
                <th className="py-2 px-3 w-28 border-r border-slate-300">DNI</th>
                <th className="py-2 px-2 text-center w-16 border-r border-slate-300">F. Nac</th>
                <th className="py-2 px-2 text-center w-20 border-r border-slate-300">Posición</th>
                <th className="py-2 px-2 text-center w-24 border-r border-slate-300">Apto Médico</th>
                <th className="py-2 px-3 text-center w-36">Firma del Jugador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 border-b-2 border-slate-900">
              {sortedPlayers.map((p, idx) => {
                const med = getMedicalCertificateInfo(p.medicalCertificateExpiresAt);
                return (
                  <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-2 text-center font-black text-sm text-red-700 border-r border-slate-300">
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-950 border-r border-slate-300">
                      {p.lastName.toUpperCase()}, {p.firstName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-300">
                      {p.dni ?? "—"}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600 border-r border-slate-300">
                      {p.birthDate ? formatDate(p.birthDate) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-center font-medium text-slate-700 border-r border-slate-300">
                      {p.position ?? "—"}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-300">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          med.status === "valid"
                            ? "bg-emerald-100 text-emerald-800"
                            : med.status === "warning"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800 font-black"
                        }`}
                      >
                        {med.status === "valid" ? "Vigente" : med.status === "warning" ? "Por vencer" : "VENCIDO"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center border-slate-200">
                      <div className="h-6 border-b border-dashed border-slate-400" />
                    </td>
                  </tr>
                );
              })}

              {/* Renglones en blanco adicionales para completar 12 jugadores reglamentarios */}
              {Array.from({ length: Math.max(0, 12 - sortedPlayers.length) }).map((_, i) => (
                <tr key={`blank-${i}`} className="h-9">
                  <td className="border-r border-slate-300 text-center text-slate-300 font-bold">
                    —
                  </td>
                  <td className="border-r border-slate-300" />
                  <td className="border-r border-slate-300" />
                  <td className="border-r border-slate-300" />
                  <td className="border-r border-slate-300" />
                  <td className="border-r border-slate-300" />
                  <td className="border-b border-dashed border-slate-300" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sección de Firmas Reglamentarias */}
        <div className="mt-12 grid grid-cols-4 gap-6 pt-4 text-center text-xs">
          <div>
            <div className="mb-2 h-10 border-b border-slate-700" />
            <span className="block font-bold text-slate-900">Firma Entrenador (DT)</span>
            <span className="text-[10px] text-slate-500">C.A. Estudiantes</span>
          </div>
          <div>
            <div className="mb-2 h-10 border-b border-slate-700" />
            <span className="block font-bold text-slate-900">Firma Delegado del Club</span>
            <span className="text-[10px] text-slate-500">Mesa de Control</span>
          </div>
          <div>
            <div className="mb-2 h-10 border-b border-slate-700" />
            <span className="block font-bold text-slate-900">Firma Árbitro Principal</span>
            <span className="text-[10px] text-slate-500">Juez del Encuentro</span>
          </div>
          <div>
            <div className="mb-2 h-10 border-b border-slate-700" />
            <span className="block font-bold text-slate-900">Comisionado Técnico</span>
            <span className="text-[10px] text-slate-500">Planillero / Apuntador</span>
          </div>
        </div>

        {/* Pie de Página Oficial */}
        <div className="mt-8 border-t border-slate-200 pt-3 flex justify-between text-[10px] text-slate-400">
          <span>ClubManager · Sistema de Gestión Deportiva</span>
          <span>Club Atlético Estudiantes de Mercedes · Documento Oficial</span>
        </div>
      </div>
    </div>
  );
}
