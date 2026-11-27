import { notFound } from "next/navigation";
import { PageHeader, NoAccess } from "@/components/ui/page";
import { can, getTenant } from "@/server/tenant";
import { getGuardianPortalData } from "@/server/data/portal";
import { GuardianPortal } from "@/components/portal/guardian-portal";
import { familyOptions } from "@/server/data/people";
import Link from "next/link";

export const metadata = { title: "Portal de la Familia" };

export default async function FamilyPortalPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string }>;
}) {
  const ctx = await getTenant();
  const params = await searchParams;

  let targetFamilyId = params.familia;

  if (ctx.role === "guardian") {
    targetFamilyId = ctx.familyIds[0];
  } else if (!targetFamilyId && (ctx.role === "club_admin" || ctx.role === "coach")) {
    const allFamilies = await familyOptions(ctx);
    targetFamilyId = allFamilies[0]?.id;
  }

  if (!targetFamilyId) notFound();

  const portalData = await getGuardianPortalData(ctx, targetFamilyId);
  if (!portalData) notFound();

  const allFamilies =
    ctx.role === "club_admin" || ctx.role === "coach"
      ? await familyOptions(ctx)
      : [];

  return (
    <div className="space-y-4">
      {/* Barra de Vista Previa para Administradores */}
      {ctx.role === "club_admin" || ctx.role === "coach" ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sky-950 font-medium">
            <span className="font-bold uppercase tracking-wider text-sky-800">
              Vista Previa de Administración
            </span>
            <span>·</span>
            <span>Estás viendo el portal tal como lo ve la familia en su celular o PC.</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sky-800">Cambiar familia:</span>
            <div className="flex gap-1.5 flex-wrap">
              {allFamilies.map((fam) => (
                <Link
                  key={fam.id}
                  href={`/app/portal?familia=${fam.id}`}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    fam.id === targetFamilyId
                      ? "bg-sky-700 text-white"
                      : "bg-white text-sky-900 border border-sky-300 hover:bg-sky-100"
                  }`}
                >
                  {fam.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <GuardianPortal
        data={portalData}
        clubId={ctx.club.id}
        clubName={ctx.club.name}
      />
    </div>
  );
}
