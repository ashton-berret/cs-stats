<script lang="ts">
  export let options: string[] = [];
  export let selected = options[0] ?? "";
  export let size: "sm" | "md" = "md";
  /** Called when a pill is chosen. If omitted, selection is purely visual. */
  export let onSelect: ((value: string) => void) | null = null;

  function pick(option: string) {
    selected = option;
    onSelect?.(option);
  }
</script>

<div class="pillbar inline-flex max-w-full items-center gap-1 overflow-x-auto p-1">
  {#each options as option}
    <button
      type="button"
      class={`pill font-medium ${size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"} ${
        selected === option ? "pill-active" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      }`}
      on:click={() => pick(option)}
    >
      {option}
    </button>
  {/each}
</div>
