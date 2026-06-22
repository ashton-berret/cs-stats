/** Short M/D label for trend x-axes (input is an ISO date string). */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** Trailing moving average over `window` points; entries before a full window use the partial mean. */
export function rollingAverage(values: number[], window: number): number[] {
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    return Math.round(mean * 100) / 100;
  });
}
