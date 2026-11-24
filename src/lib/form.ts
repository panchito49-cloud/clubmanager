export type FormState = {
  error?: string;
  ok?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export type ActionResult = {
  error?: string;
  ok?: string;
};

/** Primer mensaje de error de un ZodError parseado, en castellano. */
export function firstError(errors: Record<string, string[] | undefined>): string | undefined {
  for (const value of Object.values(errors)) {
    if (value && value.length > 0) return value[0];
  }
  return undefined;
}
