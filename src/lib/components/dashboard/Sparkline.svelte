<script lang="ts">
  export let data: number[] = [];
  export let color = "#ffffff";
  export let width = 110;
  export let height = 34;
  export let fill = true;

  const pad = 3;

  $: pts = buildPoints(data);
  $: linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  $: areaPath = pts.length ? `${linePath} L${pts[pts.length - 1].x},${height - pad} L${pts[0].x},${height - pad} Z` : "";
  // Approximate length for the draw animation.
  $: len = pts.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y)), 0);

  function buildPoints(values: number[]) {
    if (values.length === 0) return [] as { x: number; y: number }[];
    const series = values.length === 1 ? [values[0], values[0]] : values;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    const stepX = (width - pad * 2) / (series.length - 1);
    return series.map((v, i) => ({
      x: pad + i * stepX,
      y: pad + (1 - (v - min) / span) * (height - pad * 2),
    }));
  }
</script>

<svg {width} {height} viewBox={`0 0 ${width} ${height}`} fill="none" class="overflow-visible">
  {#if fill && areaPath}
    <path d={areaPath} fill={color} opacity="0.14" />
  {/if}
  {#if linePath}
    <path
      d={linePath}
      stroke={color}
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style={`stroke-dasharray:${len};--spark-len:${len};animation:sparkdraw 0.9s ease forwards`}
    />
  {/if}
</svg>
