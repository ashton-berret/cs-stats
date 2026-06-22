<script lang="ts">
  export let type: "button" | "submit" | "reset" = "button";
  export let disabled = false;
  export let className = "";
</script>

<button
  type={type}
  disabled={disabled}
  class={`rounded-md bg-[var(--color-primary)] px-4 py-2 font-medium text-[#0e100f] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 btn-glow ${className}`}
  {...$$restProps}
>
  <slot />
</button>
