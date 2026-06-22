<script lang="ts">
  import { MAP_NAMES } from "$lib/config/maps";

  export let query = "";
  export let mapFilter = "all";
  export let resultFilter = "all";
  export let sortBy = "newest";
</script>

<div class="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface-elevated)] p-4 md:grid-cols-4">
  <label class="block">
    <span class="mb-1 block text-xs uppercase text-[var(--color-text-muted)]">Search</span>
    <input
      bind:value={query}
      placeholder="Map or player"
      class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
    />
  </label>

  <label class="block">
    <span class="mb-1 block text-xs uppercase text-[var(--color-text-muted)]">Map</span>
    <select bind:value={mapFilter} class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
      <option value="all">All maps</option>
      {#each MAP_NAMES as map}
        <option value={map}>{map}</option>
      {/each}
    </select>
  </label>

  <label class="block">
    <span class="mb-1 block text-xs uppercase text-[var(--color-text-muted)]">Result</span>
    <select bind:value={resultFilter} class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
      <option value="all">All results</option>
      <option value="WIN">Wins</option>
      <option value="LOSS">Losses</option>
      <option value="TIE">Ties</option>
    </select>
  </label>

  <label class="block">
    <span class="mb-1 block text-xs uppercase text-[var(--color-text-muted)]">Sort</span>
    <select bind:value={sortBy} class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
      <option value="newest">Newest</option>
      <option value="kd">K/D</option>
      <option value="adr">ADR</option>
    </select>
  </label>
</div>
