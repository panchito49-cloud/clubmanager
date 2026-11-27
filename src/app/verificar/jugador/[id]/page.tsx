import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { clubs, players, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatDate, ageFrom } from "@/lib/format";
import { getMedicalCertificateInfo } from "@/lib/medical";

export const metadata = { title: "Verificación de Jugador Habilitado" };

export default async function PublicVerifyPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [row] = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      dni: players.dni,
      birthDate: players.birthDate,
      jerseyNumber: players.jerseyNumber,
      position: players.position,
      status: players.status,
      bloodType: players.bloodType,
      insuranceProvider: players.insuranceProvider,
      medicalCertificateExpiresAt: players.medicalCertificateExpiresAt,
      clubId: players.clubId,
      clubName: clubs.name,
      categoryName: categories.name,
    })
    .from(players)
    .leftJoin(clubs, eq(clubs.id, players.clubId))
    .leftJoin(categories, eq(categories.id, players.categoryId))
    .where(eq(players.id, id))
    .limit(1);

  if (!row) notFound();

  const medical = getMedicalCertificateInfo(row.medicalCertificateExpiresAt);
  const isEligible = row.status === "active" && (medical.status === "valid" || medical.status === "warning");

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white flex flex-col items-center justify-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Header Oficial */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 p-6 text-center text-white relative">
          <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-white shadow-lg">
            <img
              src="/logo-estudiantes-basquet.jpg"
              alt="Club Atlético Estudiantes"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight">
            {row.clubName ?? "Club Atlético Estudiantes"}
          </h1>
          <p className="text-xs font-semibold text-red-100">
            Validación de Mesa de Control y Arbitraje
          </p>
        </div>

        {/* Dictamen de Habilitación */}
        <div className="p-6">
          <div
            className={`rounded-2xl p-4 text-center border ${
              isEligible
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                : "bg-rose-950/60 border-rose-500/50 text-rose-300"
            }`}
          >
            <div className="text-3xl mb-1">{isEligible ? "✓" : "⚠"}</div>
            <span className="block text-sm font-black uppercase tracking-wider">
              {isEligible ? "JUGADOR HABILITADO PARA JUGAR" : "JUGADOR NO HABILITADO"}
            </span>
            <span className="mt-1 block text-xs opacity-90">
              {isEligible
                ? "Apto médico y ficha deportiva validados."
                : medical.description}
            </span>
          </div>

          {/* Ficha Resumida */}
          <div className="mt-6 space-y-3 rounded-2xl bg-slate-800/60 p-4 border border-slate-700/50 text-sm">
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Jugador:</span>
              <span className="font-bold text-white">
                {row.lastName}, {row.firstName}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">DNI:</span>
              <span className="font-semibold text-white">{row.dni ?? "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Categoría:</span>
              <span className="font-semibold text-red-400">{row.categoryName ?? "Sin categoría"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Camiseta / Dorsal:</span>
              <span className="font-bold text-white">{row.jerseyNumber ? `#${row.jerseyNumber}` : "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Grupo Sanguíneo:</span>
              <span className="font-medium text-white">{row.bloodType ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Apto Médico:</span>
              <span
                className={`font-semibold ${
                  medical.status === "valid"
                    ? "text-emerald-400"
                    : medical.status === "warning"
                      ? "text-amber-400"
                      : "text-rose-400"
                }`}
              >
                {medical.label}
              </span>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Verificación generada en tiempo real por el sistema Nuestro Club para Club Atlético Estudiantes de Mercedes.
          </div>
        </div>
      </div>
    </div>
  );
}
