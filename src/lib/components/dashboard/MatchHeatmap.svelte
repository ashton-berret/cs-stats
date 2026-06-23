<script lang="ts">
  export let days: { date: string; count: number; score: number | null }[] = [];
  export let cell = 13;
  export let title = "Match heatmap";
  export let mode: "activity" | "performance" = "performance";

  // Activity ramp (green, by match count) — GitHub-style.
  const ACTIVITY_COLORS = [
    "var(--color-bg-surface-overlay)",
    "#0E4429",
    "#006D32",
    "#26A641",
    "#39D353",
  ];
  // Performance ramp (red → green, by daily Form score).
  const EMPTY = "var(--color-bg-surface-overlay)";
  const PERF_COLORS = ["#E5484D", "#F2883E", "#F2C94C", "#7BC96F", "#2EA043"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function weekday(date: string): number {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
  }
  function activityLevel(count: number): number {
    if (count <= 0) return 0;
    return Math.min(count, 4);
  }
  function perfBucket(score: number): number {
    if (score < 35) return 0;
    if (score < 50) return 1;
    if (score < 65) return 2;
    if (score < 80) return 3;
    return 4;
  }
  function cellColor(day: { count: number; score: number | null }): string {
    if (mode === "activity") return ACTIVITY_COLORS[activityLevel(day.count)];
    if (day.count === 0 || day.score === null) return EMPTY;
    return PERF_COLORS[perfBucket(day.score)];
  }
  function tip(day: { date: string; count: number; score: number | null }): string {
    const [y, m, d] = day.date.split("-").map(Number);
    const when = `${MONTHS[m - 1]} ${d}, ${y}`;
    if (day.count === 0) return `No matches · ${when}`;
    if (mode === "performance" && day.score !== null) return `Form ${day.score} · ${day.count} ${day.count === 1 ? "match" : "matches"} · ${when}`;
    return `${day.count} ${day.count === 1 ? "match" : "matches"} · ${when}`;
  }

  // Pad first week so rows align to weekday (Sun at top), then chunk into week-columns.
  $: weeks = (() => {
    if (!days.length) return [] as (typeof days)[];
    const padded: (typeof days[number] | null)[] = [...Array(weekday(days[0].date)).fill(null), ...days];
    const out: (typeof days[number] | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) out.push(padded.slice(i, i + 7));
    return out;
  })();

  $: monthLabels = weeks.map((week, i) => {
    const first = week.find((c) => c);
    if (!first) return "";
    const month = Number(first.date.split("-")[1]) - 1;
    const prev = weeks[i - 1]?.find((c) => c);
    const prevMonth = prev ? Number(prev.date.split("-")[1]) - 1 : -1;
    return month !== prevMonth ? MONTHS[month] : "";
  });

  $: total = days.reduce((s, d) => s + d.count, 0);
  $: activeDays = days.filter((d) => d.count > 0).length;
  $: legendColors = mode === "activity" ? ACTIVITY_COLORS : PERF_COLORS;
</script>

<div class="mb-3 flex items-center justify-between gap-2">
  <h2 class="font-[var(--font-display)] text-base">{title}</h2>
  <div class="pillbar inline-flex p-0.5 text-[11px]">
    <button
      type="button"
      class={`pill px-2.5 py-1 ${mode === "activity" ? "pill-active" : "text-[var(--color-text-secondary)]"}`}
      on:click={() => (mode = "activity")}
    >
      Activity
    </button>
    <button
      type="button"
      class={`pill px-2.5 py-1 ${mode === "performance" ? "pill-active" : "text-[var(--color-text-secondary)]"}`}
      on:click={() => (mode = "performance")}
    >
      Form
    </button>
  </div>
</div>

<div class="overflow-x-auto">
  <div class="inline-block min-w-full">
    <div class="mb-1 flex gap-[3px] text-[10px] text-[var(--color-text-muted)]">
      {#each monthLabels as m}
        <div class="shrink-0" style={`width:${cell}px`}>{m}</div>
      {/each}
    </div>
    <div class="flex gap-[3px]">
      {#each weeks as week}
        <div class="flex flex-col gap-[3px]">
          {#each week as day}
            {#if day}
              <div
                class="rounded-[3px] transition-transform hover:scale-125"
                style={`width:${cell}px;height:${cell}px;background:${cellColor(day)}`}
                title={tip(day)}
              ></div>
            {:else}
              <div style={`width:${cell}px;height:${cell}px`}></div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>

<div class="mt-3 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
  <span>{mode === "performance" ? "Daily form" : `${total} matches · ${activeDays} active days`}</span>
  <div class="flex items-center gap-1">
    <span class="text-[var(--color-text-muted)]">{mode === "performance" ? "Low" : "Less"}</span>
    {#each legendColors as color}
      <span class="h-[11px] w-[11px] rounded-[3px]" style={`background:${color}`}></span>
    {/each}
    <span class="text-[var(--color-text-muted)]">{mode === "performance" ? "High" : "More"}</span>
  </div>
</div>
