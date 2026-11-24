"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthFormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit";
import { Alert } from "@/components/ui/page";
import { Field, Input } from "@/components/ui/form";

export function ResetForm({ token }: { token: string }) {
  const boundAction = resetPasswordAction.bind(null, token);
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    boundAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.ok}</Alert>
        <a
          href="/login"
          className="flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Ir al ingreso
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field
        label="Nueva contraseña"
        htmlFor="password"
        hint="Mínimo 10 caracteres."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <Field label="Repetir contraseña" htmlFor="confirm" required>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <SubmitButton className="w-full">Guardar contraseña</SubmitButton>
    </form>
  );
}
