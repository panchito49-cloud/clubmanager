import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader, NoAccess, Alert } from "@/components/ui/page";
import { can, getTenant } from "@/server/tenant";
import { getFamilyDebtForRefinancing, listCriticalOverdueCases } from "@/server/data/finance";
import { createPaymentPlanAction } from "@/app/actions/finance";
import { RefinancingCalculator } from "@/components/app/refinancing-calculator";

export const metadata = { title: "Refinanciación de Deuda y Plan de Pago" };

export default async function RefinancingPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "fees.manage")) return <NoAccess />;

  const params = await searchParams;
  let familyId = params.familia;

  // Si no se pasó familia por query param, buscamos la primera familia con mora crítica
  if (!familyId) {
    const criticalCases = await listCriticalOverdueCases(ctx, 90);
    if (criticalCases.length > 0 && criticalCases[0]) {
      familyId = criticalCases[0].familyId;
    }
  }

  if (!familyId) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="text-lg font-bold text-ink-900">Sin casos de mora crítica</h1>
        <p className="mt-1 text-sm text-ink-500">
          No se encontraron familias con obligaciones de pago de más de 90 días de antigüedad para refinanciar.
        </p>
        <Link
          href="/app/cuotas"
          className="mt-4 inline-block text-xs font-semibold text-brand-700 hover:underline"
        >
          ← Volver a Cuotas
        </Link>
      </div>
    );
  }

  const data = await getFamilyDebtForRefinancing(ctx, familyId);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Refinanciación de Deuda · Plan de Facilidades"
        description={`Armado de acuerdo de pago en cuotas para ${data.family.name} · Detección inteligente de morosidad prolongada`}
        backHref="/app/cuotas"
        backLabel="Cuotas"
      />

      {data.criticalBalanceCents > 0 ? (
        <Alert tone="warning">
          <strong>Atención:</strong> Esta familia registra cuotas impagas con más de 90 días de retraso.
          El plan de pago permite reestructurar la deuda para que los deportistas continúen habilitados federativamente.
        </Alert>
      ) : null}

      <RefinancingCalculator
        familyId={data.family.id}
        familyName={data.family.name}
        initialCharges={data.charges}
        action={async (formData: FormData) => {
          "use server";
          await createPaymentPlanAction(null, formData);
        }}
      />
    </div>
  );
}
