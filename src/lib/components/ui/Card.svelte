<script lang="ts">
  export let className = "";
</script>

<div
  class={`rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface-elevated)] p-5 shadow-md card-glow ${className}`}
  {...$$restProps}
>
  <slot />
</div>
