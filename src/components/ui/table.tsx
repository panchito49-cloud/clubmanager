import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Table({
  children,
  className,
  minWidth = "min-w-[640px]",
}: {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-sm", minWidth, className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-ink-50/70">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-ink-100">{children}</tbody>;
}

export function TR({
  children,
  className,
  onClickHref,
}: {
  children: ReactNode;
  className?: string;
  onClickHref?: string;
}) {
  return (
    <tr
      className={cn("transition-colors hover:bg-ink-50/60", className)}
      data-href={onClickHref}
    >
      {children}
    </tr>
  );
}

export function TH({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-ink-200 px-4 py-2.5 text-xs font-semibold text-ink-500",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  align = "left",
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-3 align-middle text-ink-700",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}
