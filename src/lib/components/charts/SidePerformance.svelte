<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { theme } from "$lib/stores";
  import { chartColors } from "./chart-helpers";
  import type { DashboardStats } from "$lib/types/analytics";

  export let data: DashboardStats["sidePerformanceByMap"];

  let metric: "winRate" | "kd" = "winRate";

  const CT_COLOR = "#6CA0DC";
  const T_COLOR = "#E0A93B";

  $: c = chartColors($theme);
  $: maps = data.map((entry) => entry.map);
  $: metricLabel = metric === "winRate" ? "Win %" : "K/D";
  $: ctValues = data.map((entry) => (entry.ct ? entry.ct[metric] : null));
  $: tValues = data.map((entry) => (entry.t ? entry.t[metric] : null));

  $: option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const list = params as { dataIndex: number }[];
        const entry = data[list[0]?.dataIndex ?? 0];
        if (!entry) return "";
        return `${entry.map}<br/>${line("CT", entry.ct)}<br/>${line("T", entry.t)}`;
      },
    },
    legend: {
      top: 0,
      textStyle: { color: c.text },
    },
    grid: { left: 42, right: 16, top: 36, bottom: 36 },
    xAxis: {
      type: "category",
      data: maps,
      axisLabel: { color: c.text, interval: 0, rotate: maps.length > 6 ? 30 : 0 },
      axisLine: { lineStyle: { color: c.border } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: c.text, formatter: metric === "winRate" ? "{value}%" : "{value}" },
      splitLine: { lineStyle: { color: c.border, opacity: 0.5 } },
    },
    series: [
      {
        name: "CT",
        type: "bar",
        data: ctValues,
        barMaxWidth: 32,
        itemStyle: { color: CT_COLOR, borderRadius: [4, 4, 0, 0] },
      },
      {
        name: "T",
        type: "bar",
        data: tValues,
        barMaxWidth: 32,
        itemStyle: { color: T_COLOR, borderRadius: [4, 4, 0, 0] },
      },
    ],
  } satisfies EChartsOption;

  function line(label: string, stats: DashboardStats["sidePerformanceByMap"][number]["ct"]): string {
    if (!stats) return `${label}: no matches`;
    const value = metric === "winRate" ? `${stats.winRate}%` : stats.kd.toFixed(2);
    const adr = stats.avgAdr === null ? "-" : stats.avgAdr;
    return `${label}: ${metricLabel} ${value} - ${stats.matches} matches - ADR ${adr}`;
  }
</script>

<div class="mb-3 flex items-center justify-end gap-2">
  <button
    type="button"
    class={`rounded-md px-3 py-1.5 text-xs font-medium ${metric === "winRate" ? "bg-[var(--color-primary)] text-[#0e100f]" : "border border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}
    on:click={() => (metric = "winRate")}
  >
    Win %
  </button>
  <button
    type="button"
    class={`rounded-md px-3 py-1.5 text-xs font-medium ${metric === "kd" ? "bg-[var(--color-primary)] text-[#0e100f]" : "border border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}
    on:click={() => (metric = "kd")}
  >
    K/D
  </button>
</div>

<EChart {option} height="300px" />
