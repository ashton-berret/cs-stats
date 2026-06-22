<script lang="ts">
  import { Card } from "$lib/components/ui";
  import type { PageData } from "./$types";

  export let data: PageData;

  $: totals = data.matches.reduce(
    (acc, match) => {
      acc.kills += match.stat.kills;
      acc.deaths += match.stat.deaths;
      acc.wins += match.result === "WIN" ? 1 : 0;
      acc.losses += match.result === "LOSS" ? 1 : 0;
      acc.ties += match.result === "TIE" ? 1 : 0;
      return acc;
    },
    { kills: 0, deaths: 0, wins: 0, losses: 0, ties: 0 },
  );
  $: kd = totals.deaths === 0 ? totals.kills : totals.kills / totals.deaths;
</script>

<section class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
    <p class="mt-2 text-[var(--color-text-secondary)]">Manual-entry summary is live. Full charts arrive in Phase 5.</p>
  </div>

  {#if data.totalMatches}
    <div class="grid gap-4 md:grid-cols-4">
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Matches</p>
        <p class="mt-2 text-3xl font-bold">{data.totalMatches}</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Recent K/D</p>
        <p class="mt-2 text-3xl font-bold">{kd.toFixed(2)}</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Kills / Deaths</p>
        <p class="mt-2 text-3xl font-bold">{totals.kills}/{totals.deaths}</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Results</p>
        <p class="mt-2 text-3xl font-bold">{totals.wins}W {totals.losses}L {totals.ties}T</p>
      </Card>
    </div>

    <Card>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold">Recent matches</h2>
          <p class="mt-1 text-sm text-[var(--color-text-secondary)]">Showing the latest saved manual entries.</p>
        </div>
        <a href="/matches" class="text-sm font-medium text-[var(--color-primary)] hover:opacity-80">View all</a>
      </div>

      <div class="mt-4 divide-y divide-[var(--color-border)]">
        {#each data.matches as match}
          <a href={`/matches/${match.id}`} class="flex items-center justify-between gap-4 py-3 hover:text-[var(--color-primary)]">
            <div>
              <p class="font-medium">{match.map}</p>
              <p class="text-sm text-[var(--color-text-secondary)]">{match.stat.kills}/{match.stat.deaths}/{match.stat.assists}</p>
            </div>
            <span class="text-sm font-semibold">{match.result}</span>
          </a>
        {/each}
      </div>
    </Card>
  {:else}
    <Card>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold">No matches yet</h2>
          <p class="mt-1 text-sm text-[var(--color-text-secondary)]">Add a match manually to start tracking trends.</p>
        </div>
        <a
          href="/matches/new"
          class="rounded-md bg-[var(--color-primary)] px-4 py-2 text-center font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)]"
        >
          Add Match
        </a>
      </div>
    </Card>
  {/if}
</section>
