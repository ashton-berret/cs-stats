<script lang="ts">
  import Sparkline from "./Sparkline.svelte";
  import SourceTag from "./SourceTag.svelte";

  export let label: string;
  export let value: string;
  export let sub = "";
  export let gradient = "linear-gradient(135deg,#F2683C,#E0432F)";
  export let spark: number[] = [];
  export let href = "";
  /** Optional provenance badge (e.g. Steam-lifetime data). */
  export let tag = "";

  const element = href ? "a" : "div";
</script>

<svelte:element
  this={element}
  {href}
  class="lift block rounded-3xl p-5 text-white shadow-lg"
  style={`background:${gradient}`}
>
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <p class="text-xs font-medium uppercase tracking-wide text-white/70">{label}</p>
      <p class="mt-1 truncate text-xl font-semibold">{value}</p>
      {#if sub}<p class="mt-0.5 truncate text-sm text-white/75">{sub}</p>{/if}
      {#if tag}<div class="mt-2"><SourceTag label={tag} onColor /></div>{/if}
    </div>
    {#if href}
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm">↗</span>
    {/if}
  </div>
  {#if spark.length}
    <div class="mt-3">
      <Sparkline data={spark} color="#ffffff" width={150} height={36} />
    </div>
  {/if}
</svelte:element>
