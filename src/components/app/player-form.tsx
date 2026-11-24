import { Field, Input, Select, Textarea, InlineFields } from "@/components/ui/form";

type Option = { id: string; name: string; gender?: string };

export type PlayerDefaults = {
  firstName?: string | null;
  lastName?: string | null;
  dni?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  categoryId?: string | null;
  familyId?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  school?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bloodType?: string | null;
  insuranceProvider?: string | null;
  insuranceNumber?: string | null;
  medicalNotes?: string | null;
  joinedAt?: string | null;
};

export function PlayerFormFields({
  categories,
  families,
  defaults,
  showMedical,
}: {
  categories: Option[];
  families: Option[];
  defaults?: PlayerDefaults;
  showMedical: boolean;
}) {
  const d = defaults ?? {};

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Datos personales
        </h3>
        <InlineFields>
          <Field label="Nombre" htmlFor="firstName" required>
            <Input id="firstName" name="firstName" defaultValue={d.firstName ?? ""} required />
          </Field>
          <Field label="Apellido" htmlFor="lastName" required>
            <Input id="lastName" name="lastName" defaultValue={d.lastName ?? ""} required />
          </Field>
          <Field label="DNI" htmlFor="dni" hint="Opcional. Si se carga no puede repetirse.">
            <Input id="dni" name="dni" inputMode="numeric" defaultValue={d.dni ?? ""} />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="birthDate">
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={d.birthDate ?? ""}
            />
          </Field>
          <Field label="Género" htmlFor="gender">
            <Select id="gender" name="gender" defaultValue={d.gender ?? ""}>
              <option value="">Sin especificar</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
            </Select>
          </Field>
          <Field label="Fecha de alta" htmlFor="joinedAt">
            <Input id="joinedAt" name="joinedAt" type="date" defaultValue={d.joinedAt ?? ""} />
          </Field>
        </InlineFields>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Club
        </h3>
        <InlineFields>
          <Field label="Categoría" htmlFor="categoryId">
            <Select id="categoryId" name="categoryId" defaultValue={d.categoryId ?? ""}>
              <option value="">Sin categoría</option>
              {categories.map((category) => {
                const suffix =
                  category.gender === "male"
                    ? " (Masc.)"
                    : category.gender === "female"
                      ? " (Fem.)"
                      : "";
                return (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {suffix}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Familia" htmlFor="familyId" hint="Agrupa hermanos y descuentos.">
            <Select id="familyId" name="familyId" defaultValue={d.familyId ?? ""}>
              <option value="">Sin familia</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dorsal" htmlFor="jerseyNumber">
            <Input
              id="jerseyNumber"
              name="jerseyNumber"
              type="number"
              min={0}
              max={99}
              defaultValue={d.jerseyNumber ?? ""}
            />
          </Field>
          <Field label="Posición" htmlFor="position">
            <Input
              id="position"
              name="position"
              placeholder="Base, alero, pívot…"
              defaultValue={d.position ?? ""}
            />
          </Field>
        </InlineFields>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Contacto y emergencia
        </h3>
        <InlineFields>
          <Field label="Contacto de emergencia" htmlFor="emergencyContactName">
            <Input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={d.emergencyContactName ?? ""}
            />
          </Field>
          <Field label="Teléfono de emergencia" htmlFor="emergencyContactPhone">
            <Input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              defaultValue={d.emergencyContactPhone ?? ""}
            />
          </Field>
          <Field label="Dirección" htmlFor="address">
            <Input id="address" name="address" defaultValue={d.address ?? ""} />
          </Field>
          <Field label="Localidad" htmlFor="city">
            <Input id="city" name="city" defaultValue={d.city ?? ""} />
          </Field>
          <Field label="Colegio" htmlFor="school">
            <Input id="school" name="school" defaultValue={d.school ?? ""} />
          </Field>
        </InlineFields>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Cobertura médica
        </h3>
        <InlineFields>
          <Field label="Obra social / prepaga" htmlFor="insuranceProvider">
            <Input
              id="insuranceProvider"
              name="insuranceProvider"
              defaultValue={d.insuranceProvider ?? ""}
            />
          </Field>
          <Field label="Número de afiliado" htmlFor="insuranceNumber">
            <Input
              id="insuranceNumber"
              name="insuranceNumber"
              defaultValue={d.insuranceNumber ?? ""}
            />
          </Field>
          <Field label="Grupo sanguíneo" htmlFor="bloodType">
            <Input id="bloodType" name="bloodType" defaultValue={d.bloodType ?? ""} />
          </Field>
        </InlineFields>
        {showMedical ? (
          <div className="mt-4">
            <Field
              label="Notas médicas"
              htmlFor="medicalNotes"
              hint="Información sensible: solo visible para el staff del club."
            >
              <Textarea
                id="medicalNotes"
                name="medicalNotes"
                rows={3}
                defaultValue={d.medicalNotes ?? ""}
                placeholder="Alergias, lesiones, indicaciones…"
              />
            </Field>
          </div>
        ) : null}
      </section>
    </div>
  );
}
