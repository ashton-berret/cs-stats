<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import type { DashboardStats } from "$lib/types/analytics";

  export let data: DashboardStats["performanceByMap"];

  $: maps = data.map((entry) => entry.map);
  $: bars = data.map((entry) => ({ value: entry.kd, itemStyle: { color: entry.color } }));

  $: option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const list = params as { dataIndex: number }[];
        const entry = data[list[0]?.dataIndex ?? 0];
        if (!entry) return "";
        const adr = entry.avgAdr === null ? "—" : entry.avgAdr;
        return `${entry.map}<br/>K/D ${entry.kd} · ${entry.matches} matches<br/>Win ${entry.winRate}% · ADR ${adr}`;
      },
    },
    grid: { left: 40, right: 16, top: 16, bottom: 32 },
    xAxis: {
      type: "category",
      data: maps,
      axisLabel: { color: "var(--color-text-secondary)", interval: 0, rotate: maps.length > 6 ? 30 : 0 },
      axisLine: { lineStyle: { color: "var(--color-border)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "var(--color-text-secondary)" },
      splitLine: { lineStyle: { color: "var(--color-border)", opacity: 0.4 } },
    },
    series: [
      {
        name: "K/D",
        type: "bar",
        data: bars,
        barMaxWidth: 48,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height="300px" />
