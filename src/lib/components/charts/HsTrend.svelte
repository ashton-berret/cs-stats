<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { shortDate } from "./chart-helpers";
  import type { DashboardStats } from "$lib/types/analytics";

  export let data: DashboardStats["hsTrend"];

  $: dates = data.map((point) => shortDate(point.date));
  $: hs = data.map((point) => point.hsPercent);

  $: option = {
    tooltip: { trigger: "axis", valueFormatter: (value) => `${value}%` },
    grid: { left: 40, right: 16, top: 16, bottom: 32 },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
      axisLabel: { color: "var(--color-text-secondary)" },
      axisLine: { lineStyle: { color: "var(--color-border)" } },
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLabel: { color: "var(--color-text-secondary)", formatter: "{value}%" },
      splitLine: { lineStyle: { color: "var(--color-border)", opacity: 0.4 } },
    },
    series: [
      {
        name: "HS%",
        type: "line",
        data: hs,
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: "#9B5DE5" },
        lineStyle: { color: "#9B5DE5", width: 2 },
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height="300px" />
