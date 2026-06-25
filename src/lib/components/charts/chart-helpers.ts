export interface ChartColors {
  /** Primary axis-label / legend text. */
  text: string;
  /** De-emphasized text. */
  muted: string;
  /** Grid lines, axis lines. */
  border: string;
  /** Surface color (e.g. donut segment borders). */
  surface: string;
}

/**
 * Concrete hex colors for ECharts, per theme. ECharts renders to <canvas>, which cannot resolve
 * CSS `var(--…)` — passing a CSS variable there falls back to ECharts' dark default (unreadable).
 * Always style chart text/lines with these instead. Mirrors the `--color-*` tokens in app.css.
 */
export function chartColors(theme: "dark" | "light"): ChartColors {
  return theme === "light"
    ? { text: "#6B7280", muted: "#9CA3AF", border: "#E5E7EB", surface: "#FFFFFF" }
    : { text: "#9AA4B2", muted: "#5E6776", border: "#2A313D", surface: "#161A21" };
}

/** Short M/D label for trend x-axes (input is an ISO date string). Rendered in local time. */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Category x-axis label formatter that blanks consecutive duplicate dates, so a day with several
 * matches shows its date once instead of repeating "6/23" under every point. Pass the same label
 * array used for `xAxis.data`.
 */
export function dedupeAxisLabel(labels: string[]): (value: string, index: number) => string {
  return (value, index) => (index > 0 && labels[index - 1] === value ? "" : value);
}

/**
 * Rolling-average windows for trend charts. `short` tracks recent form; `long` is the baseline
 * trajectory. Tunable here in one place (was a single 5-match window, too twitchy — ~one session).
 */
export const TREND_WINDOWS = { short: 10, long: 20 } as const;

/** Trailing moving average over `window` points; entries before a full window use the partial mean. */
export function rollingAverage(values: number[], window: number): number[] {
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    return Math.round(mean * 100) / 100;
  });
}
