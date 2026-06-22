/** Shared display formatters. Keep presentation logic here, not in components. */

/** Fixed-decimal ratio (e.g. K/D). Returns "—" for null/undefined. */
export function formatRatio(value: number | null | undefined, decimals = 2): string {
  return value === null || value === undefined ? "—" : value.toFixed(decimals);
}

/** Percent with a trailing "%". `value` is already on a 0-100 scale. "—" for null. */
export function formatPercent(value: number | null | undefined, decimals = 0): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(decimals)}%`;
}

/** Plain number or "—" for null/undefined. */
export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}

/** Coarse relative time ("today", "3 days ago", "2 weeks ago"). Input is an ISO date string. */
export function relativeDate(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** Local date label (e.g. "Jun 22, 2026") from an ISO string. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Minutes -> "Mm" or "Hh Mm". "—" for null. */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
