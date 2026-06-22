<script lang="ts">
  export let label = "";
  export let name = "";
  export let required = false;
  export let value = "";
</script>

<label class="mb-3 block">
  {#if label}
    <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">{label}</span>
  {/if}
  <select
    {name}
    {required}
    bind:value
    class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
    {...$$restProps}
  >
    <slot />
  </select>
</label>
