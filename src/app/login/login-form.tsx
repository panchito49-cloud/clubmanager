"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit";
import { Alert } from "@/components/ui/page";
import { Field, Input } from "@/components/ui/form";

export function LoginForm({ prefill }: { prefill: { email: string; password: string } | null }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={prefill?.email ?? ""}
          placeholder="tu@club.com"
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue={prefill?.password ?? ""}
          placeholder="••••••••"
        />
      </Field>

      <SubmitButton className="w-full">Ingresar</SubmitButton>

      <div className="flex items-center justify-between text-xs">
        <Link href="/recuperar" className="text-ink-500 hover:text-ink-800">
          Olvidé mi contraseña
        </Link>
        <Link href="/" className="text-ink-500 hover:text-ink-800">
          Volver al inicio
        </Link>
      </div>
    </form>
  );
}
