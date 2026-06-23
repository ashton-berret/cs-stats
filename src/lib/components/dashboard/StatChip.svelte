<script lang="ts">
  export let label: string;
  export let value: string;
  export let sub = "";
  export let icon = "▸";
  export let color = "var(--color-primary)";
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
    <p class="font-[var(--font-mono)] text-2xl leading-tight text-[var(--color-text-primary)]">{value}</p>
    {#if sub}<p class="truncate text-xs text-[var(--color-text-muted)]">{sub}</p>{/if}
  </div>
</div>
