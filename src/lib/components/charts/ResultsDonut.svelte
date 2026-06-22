<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import type { DashboardStats } from "$lib/types/analytics";

  export let data: DashboardStats["resultBreakdown"];

  const LABELS: Record<string, string> = { WIN: "Wins", LOSS: "Losses", TIE: "Ties" };
  const COLORS: Record<string, string> = { WIN: "#2ED573", LOSS: "#FF4757", TIE: "#F2A900" };

  $: pie = data
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      name: LABELS[entry.result] ?? entry.result,
      value: entry.count,
      itemStyle: { color: COLORS[entry.result] ?? "#6C757D" },
    }));

  $: option = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { color: "var(--color-text-secondary)" } },
    series: [
      {
        name: "Results",
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: false,
        itemStyle: { borderColor: "var(--color-bg-base)", borderWidth: 2 },
        label: { show: false },
        data: pie,
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height="300px" />
