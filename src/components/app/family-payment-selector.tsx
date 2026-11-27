"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/form";

export function FamilyPaymentSelector({
  families,
  selectedId,
}: {
  families: Array<{ id: string; name: string }>;
  selectedId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const familyId = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("familia", familyId);
    params.delete("monto"); // reinicia para que calcule el nuevo total
    router.push(`/app/pagos/nuevo?${params.toString()}`);
  };

  return (
    <Select
      id="familyId"
      name="familyId"
      value={selectedId}
      onChange={handleChange}
      required
    >
      {families.map((fam) => (
        <option key={fam.id} value={fam.id}>
          {fam.name}
        </option>
      ))}
    </Select>
  );
}
