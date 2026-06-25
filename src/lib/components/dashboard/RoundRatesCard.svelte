<script lang="ts">
  import type { RoundRates, RoundRateLine } from "$lib/types/analytics";

  export let data: RoundRates;

  // Toggle between Overall / By side / By map — keeps the card compact while covering all three views.
  type View = "overall" | "side" | "map";
  let view: View = "overall";

  const SIDE_LABEL: Record<"CT" | "T", string> = { CT: "CT", T: "T" };
  const SIDE_COLOR: Record<"CT" | "T", string> = { CT: "#6CA0DC", T: "#E0A93B" };

  $: hasSideData = data.bySide.length > 0;
  $: hasMapData = data.byMapSide.length > 0;
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-[var(--font-display)] text-lg">K / D / A per {data.windowRounds} rounds</h2>
      <p class="text-sm text-[var(--color-text-secondary)]">
        Normalized to one casual half so longer and shorter matches compare fairly.
      </p>
    </div>
    <div class="flex shrink-0 gap-1 rounded-full bg-[var(--color-bg-surface-overlay)] p-1 text-xs">
      <button
        type="button"
        class={`rounded-full px-3 py-1 font-medium transition-colors ${view === "overall" ? "bg-[var(--color-primary)] text-[#0e100f]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
        on:click={() => (view = "overall")}
      >
        Overall
      </button>
      <button
        type="button"
        disabled={!hasSideData}
        class={`rounded-full px-3 py-1 font-medium transition-colors disabled:opacity-40 ${view === "side" ? "bg-[var(--color-primary)] text-[#0e100f]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
        on:click={() => (view = "side")}
      >
        By side
      </button>
      <button
        type="button"
        disabled={!hasMapData}
        class={`rounded-full px-3 py-1 font-medium transition-colors disabled:opacity-40 ${view === "map" ? "bg-[var(--color-primary)] text-[#0e100f]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
        on:click={() => (view = "map")}
      >
        By map
      </button>
    </div>
  </div>

  {#if !data.overall}
    <p class="py-10 text-center text-sm text-[var(--color-text-secondary)]">
      No round counts recorded yet — add a match score or capture one via GSI.
    </p>
  {:else if view === "overall"}
    {@const line = data.overall}
    <div class="grid grid-cols-3 gap-3">
      {#each [{ label: "Kills", value: line.kills, color: "var(--color-success)" }, { label: "Deaths", value: line.deaths, color: "var(--color-danger)" }, { label: "Assists", value: line.assists, color: "#9B5DE5" }] as cell}
        <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-4 py-4 text-center">
          <p class="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">{cell.label}</p>
          <p class="font-[var(--font-mono)] text-3xl leading-tight" style={`color:${cell.color}`}>{cell.value.toFixed(1)}</p>
        </div>
      {/each}
    </div>
    <p class="text-center text-xs text-[var(--color-text-muted)]">
      {line.matches} {line.matches === 1 ? "match" : "matches"} · {line.rounds} rounds
    </p>
  {:else if view === "side"}
    {@render lineTable(data.bySide.map((s) => ({ label: SIDE_LABEL[s.side], color: SIDE_COLOR[s.side], rates: s.rates })))}
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            <th class="py-2 pr-3 font-medium">Map</th>
            <th class="py-2 pr-3 text-center font-medium">Side</th>
            <th class="py-2 pr-3 text-right font-medium">K</th>
            <th class="py-2 pr-3 text-right font-medium">D</th>
            <th class="py-2 pr-3 text-right font-medium">A</th>
            <th class="py-2 text-right font-medium">Rounds</th>
          </tr>
        </thead>
        <tbody>
          {#each data.byMapSide as row (row.map)}
            {#each [{ side: "CT" as const, line: row.ct }, { side: "T" as const, line: row.t }] as cell}
              {#if cell.line}
                <tr class="border-t border-[var(--color-border)]">
                  <td class="py-2 pr-3">
                    <span class="inline-flex items-center gap-2">
                      <span class="h-2.5 w-2.5 rounded-full" style={`background:${row.color}`}></span>
                      {row.map}
                    </span>
                  </td>
                  <td class="py-2 pr-3 text-center">
                    <span class="font-[var(--font-mono)] text-xs font-semibold" style={`color:${SIDE_COLOR[cell.side]}`}>{cell.side}</span>
                  </td>
                  <td class="py-2 pr-3 text-right font-[var(--font-mono)]">{cell.line.kills.toFixed(1)}</td>
                  <td class="py-2 pr-3 text-right font-[var(--font-mono)]">{cell.line.deaths.toFixed(1)}</td>
                  <td class="py-2 pr-3 text-right font-[var(--font-mono)]">{cell.line.assists.toFixed(1)}</td>
                  <td class="py-2 text-right font-[var(--font-mono)] text-[var(--color-text-muted)]">{cell.line.rounds}</td>
                </tr>
              {/if}
            {/each}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#snippet lineTable(rows: { label: string; color: string; rates: RoundRateLine }[])}
  <table class="w-full border-collapse text-sm">
    <thead>
      <tr class="text-left text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
        <th class="py-2 pr-3 font-medium">Side</th>
        <th class="py-2 pr-3 text-right font-medium">K</th>
        <th class="py-2 pr-3 text-right font-medium">D</th>
        <th class="py-2 pr-3 text-right font-medium">A</th>
        <th class="py-2 text-right font-medium">Rounds</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.label)}
        <tr class="border-t border-[var(--color-border)]">
          <td class="py-2 pr-3">
            <span class="font-semibold" style={`color:${row.color}`}>{row.label}</span>
          </td>
          <td class="py-2 pr-3 text-right font-[var(--font-mono)]">{row.rates.kills.toFixed(1)}</td>
          <td class="py-2 pr-3 text-right font-[var(--font-mono)]">{row.rates.deaths.toFixed(1)}</td>
          <td class="py-2 pr-3 text-right font-[var(--font-mono)]">{row.rates.assists.toFixed(1)}</td>
          <td class="py-2 text-right font-[var(--font-mono)] text-[var(--color-text-muted)]">{row.rates.rounds}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/snippet}
