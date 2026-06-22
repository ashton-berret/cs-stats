<script lang="ts">
  export let open = false;
  export let title = "";
  export let onClose: () => void = () => {};

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" on:click={handleBackdropClick}>
    <div class="w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface-elevated)] p-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">{title}</h2>
        <button type="button" on:click={onClose}>Close</button>
      </div>
      <slot />
    </div>
  </div>
{/if}
