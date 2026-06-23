<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { theme } from "$lib/stores";
  import { shortDate, chartColors } from "./chart-helpers";
  import type { DashboardStats } from "$lib/types/analytics";

  export let data: DashboardStats["adrTrend"];

  $: c = chartColors($theme);
  $: dates = data.map((point) => shortDate(point.date));
  $: adr = data.map((point) => point.adr);

  $: option = {
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 16, top: 16, bottom: 32 },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
      axisLabel: { color: c.text },
      axisLine: { lineStyle: { color: c.border } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: c.text },
      splitLine: { lineStyle: { color: c.border, opacity: 0.5 } },
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
