<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { theme } from "$lib/stores";
  import { chartColors } from "./chart-helpers";
  import { CATEGORY_COLORS } from "./weapon-colors";
  import type { WeaponStat } from "$lib/types/weapons";

  export let weapons: WeaponStat[];
  export let limit = 12;
  export let minShots = 100; // ignore tiny sample sizes that skew accuracy

  $: c = chartColors($theme);
  // Weapons with a meaningful sample, top by kills, shown as accuracy bars.
  $: ranked = weapons
    .filter((weapon) => weapon.accuracy !== null && (weapon.shots ?? 0) >= minShots)
    .sort((a, b) => b.kills - a.kills)
    .slice(0, limit);

  $: option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => `${value}%`,
    },
    grid: { left: 40, right: 16, top: 8, bottom: 56 },
    xAxis: {
      type: "category",
      data: ranked.map((weapon) => weapon.display),
      axisLabel: { color: c.text, interval: 0, rotate: 35 },
      axisLine: { lineStyle: { color: c.border } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: c.text, formatter: "{value}%" },
      splitLine: { lineStyle: { color: c.border, opacity: 0.5 } },
    },
    series: [
      {
        type: "bar",
        data: ranked.map((weapon) => ({ value: weapon.accuracy, itemStyle: { color: CATEGORY_COLORS[weapon.category] } })),
        barMaxWidth: 36,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  } satisfies EChartsOption;
</script>

{#if ranked.length}
  <EChart {option} height="300px" />
{:else}
  <p class="py-12 text-center text-sm text-[var(--color-text-secondary)]">Not enough shots recorded for accuracy yet.</p>
{/if}
