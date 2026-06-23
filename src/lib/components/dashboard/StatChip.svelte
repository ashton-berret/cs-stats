<script lang="ts">
  export let label: string;
  export let value: string;
  export let sub = "";
  export let icon = "▸";
  export let color = "var(--color-primary)";
  export let delta: { value: string; direction: "up" | "down" | "flat" } | null = null;

  $: deltaClass =
    delta?.direction === "up"
      ? "text-[var(--color-success)]"
      : delta?.direction === "down"
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-text-muted)]";
  $: deltaSymbol = delta?.direction === "up" ? "▲" : delta?.direction === "down" ? "▼" : "•";
</script>

<div class="glass-card lift flex items-center gap-4 px-4 py-3.5">
  <span
    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-[#0e100f]"
    style={`background:${color}`}
  >
    {icon}
  </span>
  <div class="min-w-0">
    <p class="truncate text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</p>
    <div class="flex items-baseline gap-2">
      <p class="font-[var(--font-mono)] text-2xl leading-tight text-[var(--color-text-primary)]">{value}</p>
      {#if delta}
        <span class={`font-[var(--font-mono)] text-xs font-semibold ${deltaClass}`}>{deltaSymbol} {delta.value}</span>
      {/if}
    </div>
    {#if sub}<p class="truncate text-xs text-[var(--color-text-muted)]">{sub}</p>{/if}
  </div>
</div>
