<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { shortDate } from "./chart-helpers";
  import type { DashboardStats } from "$lib/types/analytics";

  export let data: DashboardStats["adrTrend"];

  $: dates = data.map((point) => shortDate(point.date));
  $: adr = data.map((point) => point.adr);

  $: option = {
    tooltip: { trigger: "axis" },
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
      axisLabel: { color: "var(--color-text-secondary)" },
      splitLine: { lineStyle: { color: "var(--color-border)", opacity: 0.4 } },
    },
    series: [
      {
        name: "ADR",
        type: "line",
        data: adr,
        smooth: true,
        symbolSize: 6,
        areaStyle: { color: "rgba(74, 158, 255, 0.15)" },
        itemStyle: { color: "#4A9EFF" },
        lineStyle: { color: "#4A9EFF", width: 2 },
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height="300px" />
