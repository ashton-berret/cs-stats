<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { theme } from "$lib/stores";
  import { shortDate, dedupeAxisLabel, rollingAverage, chartColors, TREND_WINDOWS } from "./chart-helpers";
  import type { DashboardStats } from "$lib/types/analytics";

  export let data: DashboardStats["kdTrend"];

  $: c = chartColors($theme);
  $: dates = data.map((point) => shortDate(point.date));
  $: kd = data.map((point) => point.kd);
  $: shortAvg = rollingAverage(kd, TREND_WINDOWS.short);
  $: longAvg = rollingAverage(kd, TREND_WINDOWS.long);

  $: option = {
    tooltip: { trigger: "axis" },
    legend: { data: ["K/D", `${TREND_WINDOWS.short}-match avg`, `${TREND_WINDOWS.long}-match avg`], bottom: 0, textStyle: { color: c.text } },
    grid: { left: 40, right: 16, top: 16, bottom: 48 },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
      axisLabel: { color: c.text, formatter: dedupeAxisLabel(dates) },
      axisLine: { lineStyle: { color: c.border } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: c.text },
      splitLine: { lineStyle: { color: c.border, opacity: 0.5 } },
    },
    series: [
      {
        name: "K/D",
        type: "line",
        data: kd,
        smooth: true,
        symbolSize: 4,
        itemStyle: { color: "#F2A900" },
        lineStyle: { color: "#F2A900", width: 1, opacity: 0.35 },
        markLine: {
          silent: true,
          symbol: "none",
          data: [{ yAxis: 1 }],
          lineStyle: { color: "#6C757D", type: "dashed" },
          label: { formatter: "1.0", color: c.muted },
        },
      },
      {
        name: `${TREND_WINDOWS.short}-match avg`,
        type: "line",
        data: shortAvg,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#4A9EFF", width: 2.5 },
      },
      {
        name: `${TREND_WINDOWS.long}-match avg`,
        type: "line",
        data: longAvg,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#2ED573", width: 2, type: "dashed" },
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height="300px" />
