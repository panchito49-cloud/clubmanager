"use client";

import { useActionState, type ReactNode } from "react";
import { Alert } from "./page";
import { SubmitButton } from "./submit";
import type { ButtonVariant } from "./button";
import { cn } from "@/lib/cn";

type FormState = { error?: string; ok?: string; fieldErrors?: Record<string, string[]> } | null;

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * Formulario con estado de envio y errores de validacion del servidor.
 * Los campos se pasan como children (renderizados en el servidor).
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = "primary",
  cancelHref,
  cancelLabel = "Cancelar",
  className,
  footerClassName,
  encType,
  hint,
  header,
}: {
  action: Action;
  children: ReactNode;
  submitLabel: string;
  submitVariant?: ButtonVariant;
  cancelHref?: string;
  cancelLabel?: string;
  className?: string;
  footerClassName?: string;
  encType?: string;
  hint?: ReactNode;
  header?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className={cn("space-y-5", className)}
      encType={encType}
      noValidate
    >
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.ok}</Alert> : null}
      {header}
      {children}
      {hint ? <div className="text-xs text-ink-500">{hint}</div> : null}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4",
          footerClassName,
        )}
      >
        <SubmitButton pending={pending} variant={submitVariant}>
          {submitLabel}
        </SubmitButton>
        {cancelHref ? (
          <a
            href={cancelHref}
            className="inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-medium text-ink-600 hover:bg-ink-100"
          >
            {cancelLabel}
          </a>
        ) : null}
      </div>
    </form>
  );
}
