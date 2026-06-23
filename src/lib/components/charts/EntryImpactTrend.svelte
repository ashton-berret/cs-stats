<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { theme } from "$lib/stores";
  import { chartColors, shortDate } from "./chart-helpers";
  import type { DashboardStats } from "$lib/types/analytics";

  export let data: NonNullable<DashboardStats["entryImpact"]>["trend"];

  $: c = chartColors($theme);
  $: dates = data.map((point) => shortDate(point.date));

  $: option = {
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const list = params as { dataIndex: number }[];
        const point = data[list[0]?.dataIndex ?? 0];
        if (!point) return "";
        return `${shortDate(point.date)}<br/>Survival ${point.survivalRate}%<br/>Entry death ${point.entryDeathRate}%`;
      },
    },
    grid: { left: 42, right: 16, top: 20, bottom: 32 },
    xAxis: {
      type: "category",
      data: dates,
      axisLabel: { color: c.text },
      axisLine: { lineStyle: { color: c.border } },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: c.text, formatter: "{value}%" },
      splitLine: { lineStyle: { color: c.border, opacity: 0.5 } },
    },
    series: [
      {
        name: "Survival",
        type: "line",
        smooth: true,
        data: data.map((point) => point.survivalRate),
        symbolSize: 6,
        lineStyle: { color: "#2ED573", width: 3 },
        itemStyle: { color: "#2ED573" },
      },
      {
        name: "Entry death",
        type: "line",
        smooth: true,
        data: data.map((point) => point.entryDeathRate),
        symbolSize: 6,
        lineStyle: { color: "#FF4757", width: 3 },
        itemStyle: { color: "#FF4757" },
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height="260px" />
