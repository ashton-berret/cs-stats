<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { shortDate, rollingAverage } from "./chart-helpers";
  import type { DashboardStats } from "$lib/types/analytics";

  export let data: DashboardStats["kdTrend"];

  const ROLLING_WINDOW = 5;

  $: dates = data.map((point) => shortDate(point.date));
  $: kd = data.map((point) => point.kd);
  $: rolling = rollingAverage(kd, ROLLING_WINDOW);

  $: option = {
    tooltip: { trigger: "axis" },
    legend: { data: ["K/D", `${ROLLING_WINDOW}-match avg`], bottom: 0, textStyle: { color: "var(--color-text-secondary)" } },
    grid: { left: 40, right: 16, top: 16, bottom: 48 },
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
        name: "K/D",
        type: "line",
        data: kd,
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: "#F2A900" },
        lineStyle: { color: "#F2A900", width: 2 },
        markLine: {
          silent: true,
          symbol: "none",
          data: [{ yAxis: 1 }],
          lineStyle: { color: "#6C757D", type: "dashed" },
          label: { formatter: "1.0", color: "var(--color-text-secondary)" },
        },
      },
      {
        name: `${ROLLING_WINDOW}-match avg`,
        type: "line",
        data: rolling,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#4A9EFF", width: 2, type: "dashed" },
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height="300px" />
