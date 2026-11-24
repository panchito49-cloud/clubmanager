import { Field, Input, Textarea, InlineFields } from "@/components/ui/form";

export type FamilyDefaults = {
  name?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
};

export function FamilyFormFields({ defaults }: { defaults?: FamilyDefaults }) {
  const d = defaults ?? {};
  return (
    <InlineFields>
      <Field label="Nombre de la familia" htmlFor="name" required hint="Ej: Familia Gómez">
        <Input id="name" name="name" defaultValue={d.name ?? ""} required />
      </Field>
      <Field label="Persona de contacto" htmlFor="contactName" required>
        <Input id="contactName" name="contactName" defaultValue={d.contactName ?? ""} required />
      </Field>
      <Field label="Teléfono" htmlFor="contactPhone" required hint="Con código de área.">
        <Input
          id="contactPhone"
          name="contactPhone"
          type="tel"
          defaultValue={d.contactPhone ?? ""}
          required
        />
      </Field>
      <Field label="Email" htmlFor="contactEmail">
        <Input id="contactEmail" name="contactEmail" type="email" defaultValue={d.contactEmail ?? ""} />
      </Field>
      <Field label="Notas" htmlFor="notes" className="sm:col-span-2">
        <Textarea id="notes" name="notes" rows={3} defaultValue={d.notes ?? ""} />
      </Field>
    </InlineFields>
  );
}
