<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { theme } from "$lib/stores";
  import { chartColors } from "./chart-helpers";
  import { CATEGORY_COLORS } from "./weapon-colors";
  import type { WeaponStat } from "$lib/types/weapons";

  export let weapons: WeaponStat[];
  export let limit = 12;

  $: c = chartColors($theme);
  // Top N by kills, drawn as horizontal bars (highest at the top).
  $: top = [...weapons].sort((a, b) => b.kills - a.kills).slice(0, limit).reverse();

  $: option = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 110, right: 24, top: 8, bottom: 24 },
    xAxis: {
      type: "value",
      axisLabel: { color: c.text },
      splitLine: { lineStyle: { color: c.border, opacity: 0.5 } },
    },
    yAxis: {
      type: "category",
      data: top.map((weapon) => weapon.display),
      axisLabel: { color: c.text },
      axisLine: { lineStyle: { color: c.border } },
    },
    series: [
      {
        type: "bar",
        data: top.map((weapon) => ({ value: weapon.kills, itemStyle: { color: CATEGORY_COLORS[weapon.category] } })),
        barMaxWidth: 22,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height={`${Math.max(220, top.length * 28)}px`} />
