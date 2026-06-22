<script lang="ts">
  import { Card } from "$lib/components/ui";
  import KDTrend from "$lib/components/charts/KDTrend.svelte";
  import AdrTrend from "$lib/components/charts/AdrTrend.svelte";
  import HsTrend from "$lib/components/charts/HsTrend.svelte";
  import ResultsDonut from "$lib/components/charts/ResultsDonut.svelte";
  import PerformanceByMap from "$lib/components/charts/PerformanceByMap.svelte";
  import { relativeDate } from "$lib/utils/format";
  import type { MatchResult } from "$lib/types/match";
  import type { PageData } from "./$types";

  export let data: PageData;

  $: stats = data.stats;

  const RESULT_STYLES: Record<MatchResult, { label: string; class: string }> = {
    WIN: { label: "W", class: "bg-[#2ED573] text-[#0e100f]" },
    LOSS: { label: "L", class: "bg-[#FF4757] text-white" },
    TIE: { label: "T", class: "bg-[#F2A900] text-[#0e100f]" },
  };

  function fmt(value: number | null, suffix = ""): string {
    return value === null ? "—" : `${value}${suffix}`;
  }
</script>

<section class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
    <p class="mt-2 text-[var(--color-text-secondary)]">Your casual-match performance over time.</p>
  </div>

  {#if stats.totalMatches === 0}
    <Card>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold">No matches yet</h2>
          <p class="mt-1 text-sm text-[var(--color-text-secondary)]">Add your first match to start tracking trends.</p>
        </div>
        <a
          href="/matches/new"
          class="rounded-md bg-[var(--color-primary)] px-4 py-2 text-center font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)]"
        >
          Add your first match
        </a>
      </div>
    </Card>
  {:else}
    <!-- Metric cards -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Matches</p>
        <p class="mt-2 text-3xl font-bold">{stats.totalMatches}</p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">last played {relativeDate(data.lastPlayedAt)}</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">K/D Ratio</p>
        <p class="mt-2 text-3xl font-bold">{stats.kdRatio.toFixed(2)}</p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{stats.totalKills} K / {stats.totalDeaths} D</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Avg ADR</p>
        <p class="mt-2 text-3xl font-bold">{fmt(stats.avgAdr)}</p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">avg HS {fmt(stats.avgHsPercent, "%")}</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Win Rate</p>
        <p class="mt-2 text-3xl font-bold">{stats.winRate}%</p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{stats.wins} W · {stats.losses} L · {stats.ties} T</p>
      </Card>
    </div>

    <!-- Recent form -->
    <Card>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Recent form</h2>
        <span class="text-xs text-[var(--color-text-secondary)]">last {stats.recentForm.length}</span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        {#each stats.recentForm as result}
          <span class={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${RESULT_STYLES[result].class}`}>
            {RESULT_STYLES[result].label}
          </span>
        {/each}
      </div>
    </Card>

    <!-- Charts -->
    <Card>
      <h2 class="mb-2 text-lg font-semibold">K/D trend</h2>
      <KDTrend data={stats.kdTrend} />
    </Card>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 class="mb-2 text-lg font-semibold">Performance by map</h2>
        <PerformanceByMap data={stats.performanceByMap} />
      </Card>
      <Card>
        <h2 class="mb-2 text-lg font-semibold">Results</h2>
        <ResultsDonut data={stats.resultBreakdown} />
      </Card>
      <Card>
        <h2 class="mb-2 text-lg font-semibold">ADR trend</h2>
        {#if stats.adrTrend.length}
          <AdrTrend data={stats.adrTrend} />
        {:else}
          <p class="py-12 text-center text-sm text-[var(--color-text-secondary)]">No ADR recorded yet.</p>
        {/if}
      </Card>
      <Card>
        <h2 class="mb-2 text-lg font-semibold">Headshot % trend</h2>
        {#if stats.hsTrend.length}
          <HsTrend data={stats.hsTrend} />
        {:else}
          <p class="py-12 text-center text-sm text-[var(--color-text-secondary)]">No headshot % recorded yet.</p>
        {/if}
      </Card>
    </div>
  {/if}
</section>
