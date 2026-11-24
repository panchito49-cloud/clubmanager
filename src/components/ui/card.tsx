import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  padded = false,
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-ink-200 bg-white",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-ink-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  href,
  accent = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  accent?: "neutral" | "brand" | "danger" | "warning" | "success";
  icon?: ReactNode;
}) {
  const accents = {
    neutral: "text-ink-900",
    brand: "text-brand-700",
    danger: "text-rose-600",
    warning: "text-amber-600",
    success: "text-emerald-600",
  } as const;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        {icon ? <span className="text-ink-400">{icon}</span> : null}
      </div>
      <p className={cn("money mt-2 text-2xl font-semibold tracking-tight", accents[accent])}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </>
  );

  const classes =
    "rounded-xl border border-ink-200 bg-white p-4 transition-shadow sm:p-5";

  if (href) {
    return (
      <Link href={href} className={cn(classes, "hover:border-ink-300 hover:shadow-sm")}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon ? (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-500">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function DefinitionList({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 1 | 2 | 3;
}) {
  const cols =
    columns === 1 ? "sm:grid-cols-1" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", cols)}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium text-ink-500">{item.label}</dt>
          <dd className="mt-0.5 text-sm text-ink-900">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
