import Link from "next/link";
import { PageHeader, NoAccess, Alert } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { importPlayersAction } from "@/app/actions/people";
import { can, getTenant } from "@/server/tenant";

export const metadata = { title: "Importar jugadores" };

export default async function ImportPlayersPage() {
  const ctx = await getTenant();
  if (!can(ctx, "players.manage")) return <NoAccess />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Importar jugadores"
        description="Cargá múltiples jugadores de una sola vez desde un archivo CSV o copiando desde Excel."
        backHref="/app/jugadores"
        backLabel="Jugadores"
        actions={
          <a
            href="/api/plantilla-jugadores"
            download="plantilla_jugadores_nuestroclub.csv"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 shadow-sm transition hover:bg-ink-50"
          >
            <Icon name="download" size={15} /> Descargar plantilla CSV
          </a>
        }
      />

      <Card>
        <CardHeader
          title="Subir archivo o pegar datos"
          description="Asegurate de que las columnas coincidan con la plantilla (separadas por coma o punto y coma)."
        />
        <CardBody>
          <ActionForm
            action={importPlayersAction}
            submitLabel="Iniciar importación"
            cancelHref="/app/jugadores"
          >
            <div className="space-y-4">
              <Field
                label="Archivo CSV"
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
                <div className="flex-grow border-t border-ink-200" />
                <span className="mx-3 flex-shrink text-xs uppercase tracking-wider text-ink-400">
                  o pegá el texto directamente
                </span>
                <div className="flex-grow border-t border-ink-200" />
              </div>

              <Field
                label="Contenido CSV"
                htmlFor="csvText"
                hint="Podés copiar y pegar las celdas desde tu planilla de cálculo."
              >
                <Textarea
                  id="csvText"
                  name="csvText"
                  rows={6}
                  placeholder={`Nombre;Apellido;DNI;FechaNacimiento;Genero;Categoria;Rama;Familia;TelefonoContacto;EmailContacto\nMateo;González;50111222;2012-05-14;M;U15;Masculino;Familia González;1140001111;gonzalez@ejemplo.com`}
                />
              </Field>
            </div>
          </ActionForm>
        </CardBody>
      </Card>

      <Card className="bg-ink-50/50">
        <CardHeader title="Consejos para una importación exitosa" />
        <CardBody>
          <ul className="list-disc space-y-2 pl-4 text-xs text-ink-600">
            <li>
              <strong>Categorías automáticas:</strong> Si la columna <em>Categoria</em> coincide con una categoría del club (ej. "U15", "Pre Mini") y la <em>Rama</em> es "Masculino" o "Femenino", el jugador se asociará automáticamente.
            </li>
            <li>
              <strong>Grupos familiares:</strong> Si completás la columna <em>Familia</em>, el sistema buscará si la familia ya existe por nombre o la creará vinculando los contactos.
            </li>
            <li>
              <strong>Control de duplicados:</strong> Si un jugador tiene un DNI que ya existe en el club, esa fila se omitirá para evitar duplicaciones.
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
