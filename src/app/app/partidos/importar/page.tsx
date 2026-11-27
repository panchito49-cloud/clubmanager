import Link from "next/link";
import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Field, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { importFixtureAction } from "@/app/actions/sports";
import { can, getTenant } from "@/server/tenant";

export const metadata = { title: "Importar Fixture y Partidos" };

export default async function ImportFixturePage() {
  const ctx = await getTenant();
  if (!can(ctx, "matches.manage")) return <NoAccess />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Importar Fixture de Básquetbol"
        description="Cargá múltiples fechas, rivales, horarios y sedes en lote desde un archivo Excel o CSV."
        backHref="/app/partidos"
        backLabel="Partidos"
        actions={
          <a
            href="/api/plantilla-fixture"
            download="plantilla_fixture_clubmanager.csv"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 shadow-xs transition hover:bg-ink-50"
          >
            <Icon name="download" size={15} /> Descargar plantilla Excel / CSV
          </a>
        }
      />

      <Card>
        <CardHeader
          title="Subir archivo o pegar fixture"
          description="Asegurate de que las columnas coincidan con la plantilla (separadas por coma o punto y coma)."
        />
        <CardBody>
          <ActionForm
            action={importFixtureAction}
            submitLabel="Importar fixture a la temporada"
            cancelHref="/app/partidos"
          >
            <div className="space-y-4">
              <Field
                label="Archivo CSV / Excel"
                htmlFor="file"
                hint="Formatos admitidos: .csv exportado desde Excel o Google Sheets."
              >
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="block w-full text-xs text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                />
              </Field>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-ink-200"></div>
                <span className="mx-4 flex-shrink text-xs font-bold uppercase tracking-wider text-ink-400">
                  O pegar texto directamente
                </span>
                <div className="flex-grow border-t border-ink-200"></div>
              </div>

              <Field
                label="Copiar y pegar celdas desde Excel"
                htmlFor="csvText"
                hint="Podés copiar el rango de celdas desde tu planilla de cálculo y pegarlo aquí."
              >
                <Textarea
                  id="csvText"
                  name="csvText"
                  rows={6}
                  placeholder={`Categoria;Rival;Fecha;Hora;Condicion;Direccion;Observaciones\nU15 Masculino;Club Quilmes;12/12/2026;18:30;Visitante;Calle 12 N° 640;Llevar camiseta alternativa\nU17 Masculino;San Martín;19/12/2026;20:00;Local;Calle 33 N° 334;`}
                />
              </Field>

              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-xs text-brand-900 space-y-1.5">
                <p className="font-bold">💡 Consejos para la importación:</p>
                <ul className="list-inside list-disc space-y-1 text-ink-700">
                  <li>
                    <strong>Categoría:</strong> Reconoce nombres como <em>U15 Masculino</em>, <em>U17</em>, <em>Primera</em>, etc.
                  </li>
                  <li>
                    <strong>Condición:</strong> Si ponés <em>Local</em> se asigna automáticamente la cancha de <strong>Calle 33 N° 334</strong>.
                  </li>
                  <li>
                    <strong>Dirección:</strong> Para los partidos <em>Visitante</em>, podés escribir la dirección o club rival y se creará automáticamente el enlace de Google Maps GPS para las familias.
                  </li>
                </ul>
              </div>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
