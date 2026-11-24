"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button";

export function SubmitButton({
  children,
  pending,
  variant = "primary",
  size = "md",
  className,
  confirmMessage,
  name,
  value,
}: {
  children: ReactNode;
  pending?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  confirmMessage?: string;
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={buttonClass(variant, size, className)}
    >
      {pending ? (
        <>
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          Guardando…
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Boton de envio para formularios server-side sin estado local. */
export function FormSubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  confirmMessage,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <SubmitButton
      pending={pending}
      variant={variant}
      size={size}
      className={className}
      confirmMessage={confirmMessage}
    >
      {children}
    </SubmitButton>
  );
}
