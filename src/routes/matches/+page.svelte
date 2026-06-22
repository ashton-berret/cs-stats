<script lang="ts">
  import { Card } from "$lib/components/ui";
  import MatchCard from "$lib/components/matches/MatchCard.svelte";
  import MatchFilters from "$lib/components/matches/MatchFilters.svelte";
  import type { MatchSummary } from "$lib/types/match";
  import type { PageData } from "./$types";

  export let data: PageData;

  let query = "";
  let mapFilter = "all";
  let resultFilter = "all";
  let sortBy = "newest";

  function kd(match: MatchSummary) {
    return match.stat.deaths === 0 ? match.stat.kills : match.stat.kills / match.stat.deaths;
  }

  $: filteredMatches = data.matches
    .filter((match) => {
      const text = `${match.map} ${match.stat.playerName}`.toLowerCase();
      const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
      const matchesMap = mapFilter === "all" || match.map === mapFilter;
      const matchesResult = resultFilter === "all" || match.result === resultFilter;
      return matchesQuery && matchesMap && matchesResult;
    })
    .sort((a, b) => {
      if (sortBy === "kd") return kd(b) - kd(a);
      if (sortBy === "adr") return (b.stat.adr ?? -1) - (a.stat.adr ?? -1);
      return new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime();
    });
</script>

<section class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-[var(--color-text-primary)]">Matches</h1>
      <p class="mt-2 text-[var(--color-text-secondary)]">Saved CS2 casual matches will be listed here.</p>
    </div>
    <a
      href="/matches/new"
      class="rounded-md bg-[var(--color-primary)] px-4 py-2 text-center font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)]"
    >
      Add Match
    </a>
  </div>

  {#if data.matches.length}
    <MatchFilters bind:query bind:mapFilter bind:resultFilter bind:sortBy />

    {#if filteredMatches.length}
      <div class="space-y-3">
        {#each filteredMatches as match}
          <MatchCard {match} />
        {/each}
      </div>
    {:else}
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">No matches fit the current filters.</p>
      </Card>
    {/if}
  {:else}
    <Card>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-[var(--color-text-secondary)]">No matches yet. Add one manually to start tracking.</p>
        <a href="/matches/new" class="rounded-md bg-[var(--color-primary)] px-4 py-2 text-center font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)]">
          Add Match
        </a>
      </div>
    </Card>
  {/if}
</section>
