<script lang="ts">
  export let label = "";
  export let name = "";
  export let type = "text";
  export let value = "";
  export let required = false;
  export let placeholder = "";
</script>

<label class="mb-3 block">
  {#if label}
    <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">{label}</span>
  {/if}
  <input
    {name}
    {type}
    {value}
    {required}
    {placeholder}
    class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
    {...$$restProps}
  />
</label>
