<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "$lib/components/charts/EChart.svelte";
  import { theme } from "$lib/stores";
  import { chartColors } from "$lib/components/charts/chart-helpers";
  import type { PerformanceMetric } from "$lib/utils/performance";

  export let metrics: PerformanceMetric[] = [];

  $: c = chartColors($theme);
  $: primary = $theme === "light" ? "#C77E00" : "#F2A900";

  $: option = {
    tooltip: {
      trigger: "item",
      formatter: () =>
        metrics.map((m) => `${m.name}: <b>${m.score}</b> <span style="opacity:.6">(${m.rawLabel} ${m.unit})</span>`).join("<br/>"),
      borderColor: c.border,
    },
    radar: {
      indicator: metrics.map((m) => ({ name: m.name, max: 100 })),
      shape: "polygon",
      splitNumber: 4,
      center: ["50%", "54%"],
      radius: "68%",
      axisName: { color: c.text, fontFamily: "Chakra Petch", fontSize: 12 },
      splitLine: { lineStyle: { color: c.border } },
      axisLine: { lineStyle: { color: c.border } },
      splitArea: {
        areaStyle: {
          color:
            $theme === "light"
              ? ["rgba(0,0,0,0.015)", "rgba(0,0,0,0.03)"]
              : ["rgba(255,255,255,0.015)", "rgba(255,255,255,0.035)"],
        },
      },
    },
    series: [
      {
        type: "radar",
        symbolSize: 5,
        lineStyle: { color: primary, width: 2 },
        itemStyle: { color: primary },
        areaStyle: { color: primary, opacity: 0.28 },
        data: [{ value: metrics.map((m) => m.score) }],
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height="320px" />

<!-- Legend with hover explanations -->
<div class="mt-2 flex flex-wrap justify-center gap-2">
  {#each metrics as m}
    <div class="group relative">
      <button
        type="button"
        class="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-1.5 text-xs"
      >
        <span class="font-medium text-[var(--color-text-secondary)]">{m.name}</span>
        <span class="font-[var(--font-mono)] text-[var(--color-text-primary)]">{m.score}</span>
      </button>
      <div
        class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface-elevated)] p-3 text-left shadow-xl group-hover:block"
      >
        <p class="font-[var(--font-display)] text-sm font-semibold">{m.name} · {m.score}/100</p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{m.description}</p>
        <p class="mt-2 font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">{m.rawLabel} {m.unit}</p>
      </div>
    </div>
  {/each}
</div>
