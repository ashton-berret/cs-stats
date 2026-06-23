<script lang="ts">
  import type { EChartsOption } from "echarts";
  import EChart from "./EChart.svelte";
  import { theme } from "$lib/stores";
  import { chartColors } from "./chart-helpers";
  import { CATEGORY_COLORS, CATEGORY_LABELS } from "./weapon-colors";
  import type { WeaponStat } from "$lib/types/weapons";

  export let weapons: WeaponStat[];
  export let limit = 6;

  $: c = chartColors($theme);
  // Highest kills at the top of the horizontal bar.
  $: ordered = [...weapons].sort((a, b) => b.kills - a.kills).slice(0, limit).reverse();

  function detailTooltip(params: unknown): string {
    const { dataIndex } = params as { dataIndex: number };
    const w = ordered[dataIndex];
    if (!w) return "";
    const acc = w.accuracy === null ? "—" : `${w.accuracy}%`;
    const shots = w.shots === null ? "—" : w.shots.toLocaleString();
    const hits = w.hits === null ? "—" : w.hits.toLocaleString();
    return `
      <div style="font-weight:600;margin-bottom:4px">${w.display}
        <span style="opacity:.55;font-weight:400">${CATEGORY_LABELS[w.category]}</span>
      </div>
      <div>Kills: <b>${w.kills.toLocaleString()}</b></div>
      <div>Accuracy: <b>${acc}</b></div>
      <div style="opacity:.7;margin-top:2px">${hits} hits / ${shots} shots</div>`;
  }

  $: option = {
    tooltip: { trigger: "item", formatter: detailTooltip, borderColor: c.border },
    grid: { left: 100, right: 56, top: 6, bottom: 6 },
    xAxis: { type: "value", show: false, max: ordered.length ? Math.max(...ordered.map((w) => w.kills)) * 1.12 : 1 },
    yAxis: {
      type: "category",
      data: ordered.map((w) => w.display),
      axisLabel: { color: c.text },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: ordered.map((w) => ({ value: w.kills, itemStyle: { color: CATEGORY_COLORS[w.category] } })),
        barMaxWidth: 18,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: "right",
          color: c.text,
          formatter: (p: unknown) => ((p as { value: number }).value ?? 0).toLocaleString(),
        },
        emphasis: { focus: "self", itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.45)" } },
      },
    ],
  } satisfies EChartsOption;
</script>

<EChart {option} height={`${Math.max(160, ordered.length * 34)}px`} />
