import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a monetary value with 2 decimals, never throwing. Backend money fields are
 * `number` but can arrive null/undefined (e.g. empty analytics periods) or, in edge
 * cases, as a BigDecimal string — either of which would make `.toFixed` crash the
 * render (and trip the error boundary). Coerces safely, defaulting non-finite to 0.
 */
export function money(n: number | string | null | undefined): string {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toFixed(2);
}

/** Format a percentage/rate with 1 decimal, never throwing (non-finite → 0). */
export function pct(n: number | string | null | undefined): string {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toFixed(1);
}
