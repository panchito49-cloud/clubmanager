import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Volver",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800"
        >
          <span aria-hidden>←</span> {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink-900">{children}</h2>
      {action}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "bg-sky-50 text-sky-800 ring-sky-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warning: "bg-amber-50 text-amber-900 ring-amber-200",
    danger: "bg-rose-50 text-rose-800 ring-rose-200",
  } as const;

  return (
    <div
      role="status"
      className={cn("rounded-lg px-3.5 py-2.5 text-sm ring-1 ring-inset", tones[tone])}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-0.5" : undefined}>{children}</div>
    </div>
  );
}

export function Flash({
  ok,
  error,
  className,
}: {
  ok?: string;
  error?: string;
  className?: string;
}) {
  if (!ok && !error) return null;
  return (
    <div className={cn("mb-4 space-y-2", className)}>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
    </div>
  );
}

export function Tabs({
  items,
  className,
}: {
  items: Array<{ href: string; label: string; active: boolean; count?: number }>;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-ink-200 px-1",
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
            item.active
              ? "text-brand-700 after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand-600"
              : "text-ink-500 hover:text-ink-800",
          )}
        >
          {item.label}
          {typeof item.count === "number" ? (
            <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export function Pagination({
  basePath,
  params,
  page,
  totalPages,
  totalItems,
  pageSize,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}) {
  if (totalItems === 0) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") query.set(key, value);
    }
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-500">
      <p>
        Mostrando <span className="font-medium text-ink-800">{from}</span>–
        <span className="font-medium text-ink-800">{to}</span> de{" "}
        <span className="font-medium text-ink-800">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <Link
          aria-disabled={page <= 1}
          href={href(Math.max(1, page - 1))}
          className={cn(
            "rounded-md px-2.5 py-1.5 font-medium ring-1 ring-inset ring-ink-200",
            page <= 1
              ? "pointer-events-none text-ink-300"
              : "text-ink-700 hover:bg-ink-50",
          )}
        >
          Anterior
        </Link>
        <span className="px-2">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Link
          aria-disabled={page >= totalPages}
          href={href(Math.min(totalPages, page + 1))}
          className={cn(
            "rounded-md px-2.5 py-1.5 font-medium ring-1 ring-inset ring-ink-200",
            page >= totalPages
              ? "pointer-events-none text-ink-300"
              : "text-ink-700 hover:bg-ink-50",
          )}
        >
          Siguiente
        </Link>
      </div>
    </div>
  );
}

export function NoAccess({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
      <p className="text-sm font-semibold text-ink-800">Sin acceso a esta sección</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
        {message ??
          "Tu rol no tiene permisos para ver esta información. Si creés que es un error, contactá al administrador del club."}
      </p>
    </div>
  );
}
