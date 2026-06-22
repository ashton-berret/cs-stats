<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import * as echarts from "echarts";
  import type { EChartsOption } from "echarts";
  import { theme } from "$lib/stores";
  import { getChartTheme } from "$lib/config/chartTheme";

  export let option: EChartsOption;
  export let height = "300px";
  export let className = "";

  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts | null = null;
  let unsubscribe = () => {};

  function applyTheme(themeMode: "dark" | "light") {
    if (!chart) return;
    const chartTheme = getChartTheme(themeMode);
    const mergedOption = {
      ...option,
      ...chartTheme,
    };
    chart.setOption(mergedOption, true);
  }

  onMount(() => {
    chart = echarts.init(chartContainer);
    unsubscribe = theme.subscribe((themeMode) => applyTheme(themeMode));
    chart.setOption(option);

    const observer = new ResizeObserver(() => chart?.resize());
    observer.observe(chartContainer);

    return () => {
      observer.disconnect();
      unsubscribe();
    };
  });

  onDestroy(() => chart?.dispose());

  $: if (chart) chart.setOption(option, true);
</script>

<div bind:this={chartContainer} class={className} style={`height: ${height}; width: 100%;`}></div>
