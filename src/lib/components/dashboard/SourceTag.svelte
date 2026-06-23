<script lang="ts">
  export let label = "Lifetime · Steam";
  /** Use on colorful gradient cards (white text) vs. neutral glass cards. */
  export let onColor = false;
</script>

<span
  class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
    onColor
      ? "bg-white/20 text-white"
      : "border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] text-[var(--color-text-secondary)]"
  }`}
  title="Lifetime, all-modes total from the Steam Web API — not limited to your tracked casual matches."
>
  <span aria-hidden="true" class="text-[8px]">◆</span>{label}
</span>
