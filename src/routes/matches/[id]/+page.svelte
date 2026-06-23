<script lang="ts">
  import { enhance } from "$app/forms";
  import { Card } from "$lib/components/ui";
  import MatchReviewForm from "$lib/components/matches/MatchReviewForm.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let editing = false;
  $: if (form?.message) editing = true;

  $: match = data.match;
  $: stat = match.stat;
  $: rounds = data.rounds;
  $: roundSummary = data.roundSummary;
  $: kd = stat.deaths === 0 ? stat.kills : stat.kills / stat.deaths;
  $: score = match.teamScore !== null && match.enemyScore !== null ? `${match.teamScore}-${match.enemyScore}` : "No score";

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function pct(value: number | null | undefined) {
    return value === null || value === undefined ? "-" : `${value}%`;
  }
</script>

<section class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <a href="/matches" class="text-sm text-[var(--color-primary)] hover:opacity-80">Back to matches</a>
      <h1 class="mt-2 font-[var(--font-display)] text-3xl font-bold uppercase tracking-wide text-[var(--color-text-primary)]">{match.map}</h1>
      <p class="mt-2 text-[var(--color-text-secondary)]">
        {formatDate(match.playedAt)} · {score} · {match.result}{#if match.side} · {match.side === "CT" ? "Counter-Terrorist" : "Terrorist"}{/if}{#if match.roundsPlayed} · {match.roundsPlayed} rounds played{/if}
      </p>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-md border border-[var(--color-border)] px-4 py-2 text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        on:click={() => (editing = !editing)}
      >
        {editing ? "View" : "Edit"}
      </button>
      <form method="POST" action="?/delete" use:enhance>
        <button
          type="submit"
          class="rounded-md border border-[var(--color-danger)]/40 px-4 py-2 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
        >
          Delete
        </button>
      </form>
    </div>
  </div>

  {#if editing}
    <Card>
      <MatchReviewForm
        action="?/save"
        submitLabel="Update match"
        values={form?.values ?? data.values}
        errors={form?.errors ?? {}}
        message={form?.message ?? ""}
      />
    </Card>
  {:else}
    <div class="grid gap-4 md:grid-cols-4">
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">K/D/A</p>
        <p class="mt-2 text-2xl font-bold">{stat.kills}/{stat.deaths}/{stat.assists}</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">K/D</p>
        <p class="mt-2 text-2xl font-bold">{kd.toFixed(2)}</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">ADR</p>
        <p class="mt-2 text-2xl font-bold">{stat.adr === null ? "-" : stat.adr.toFixed(1)}</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">HS</p>
        <p class="mt-2 text-2xl font-bold">{stat.hsPercent === null ? "-" : `${stat.hsPercent.toFixed(1)}%`}</p>
      </Card>
    </div>

    {#if roundSummary && rounds.length}
      <Card>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold">Round timeline</h2>
            <p class="mt-1 text-sm text-[var(--color-text-secondary)]">Entry (est.) uses own-player GSI only, so it is a proxy.</p>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p class="text-[var(--color-text-secondary)]">Entry success</p>
              <p class="font-[var(--font-mono)] text-lg">{pct(roundSummary.entrySuccessRate)}</p>
            </div>
            <div>
              <p class="text-[var(--color-text-secondary)]">Survival</p>
              <p class="font-[var(--font-mono)] text-lg">{roundSummary.survivalRate}%</p>
            </div>
            <div>
              <p class="text-[var(--color-text-secondary)]">2K+ rounds</p>
              <p class="font-[var(--font-mono)] text-lg">{roundSummary.multiKillRounds}</p>
            </div>
            <div>
              <p class="text-[var(--color-text-secondary)]">Avg damage</p>
              <p class="font-[var(--font-mono)] text-lg">{roundSummary.avgRoundDamage}</p>
            </div>
          </div>
        </div>
        <div class="mt-5 flex flex-wrap gap-2">
          {#each rounds as round}
            <div
              class={`flex h-12 w-12 flex-col items-center justify-center rounded-md border text-xs ${
                round.won === true
                  ? "border-[var(--color-success)]/50 bg-[var(--color-success)]/15"
                  : round.won === false
                    ? "border-[var(--color-danger)]/50 bg-[var(--color-danger)]/15"
                    : "border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)]"
              }`}
              title={`Round ${round.round}: ${round.kills}K, ${round.damage} dmg`}
            >
              <span class="font-[var(--font-mono)] font-bold">{round.won === true ? "W" : round.won === false ? "L" : "?"}{round.round}</span>
              <span class={round.side === "CT" ? "text-[#6CA0DC]" : round.side === "T" ? "text-[#E0A93B]" : "text-[var(--color-text-muted)]"}>
                {round.entryFragEst ? "EF" : round.entryDeathEst ? "ED" : round.side ?? "-"}
              </span>
            </div>
          {/each}
        </div>
      </Card>
    {/if}

    <Card>
      <h2 class="text-lg font-semibold">Details</h2>
      <dl class="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <dt class="text-sm text-[var(--color-text-secondary)]">Player</dt>
          <dd class="mt-1 font-medium">{stat.playerName}</dd>
        </div>
        <div>
          <dt class="text-sm text-[var(--color-text-secondary)]">Team</dt>
          <dd class="mt-1 font-medium">{stat.team}</dd>
        </div>
        <div>
          <dt class="text-sm text-[var(--color-text-secondary)]">Source</dt>
          <dd class="mt-1 font-medium">{match.parseSource}</dd>
        </div>
        <div>
          <dt class="text-sm text-[var(--color-text-secondary)]">MVPs</dt>
          <dd class="mt-1 font-medium">{stat.mvps ?? "-"}</dd>
        </div>
        <div>
          <dt class="text-sm text-[var(--color-text-secondary)]">Rating</dt>
          <dd class="mt-1 font-medium">{stat.hltvRating ?? "-"}</dd>
        </div>
        <div>
          <dt class="text-sm text-[var(--color-text-secondary)]">Utility damage</dt>
          <dd class="mt-1 font-medium">{stat.utilityDamage ?? "-"}</dd>
        </div>
      </dl>
    </Card>

    {#if match.notes}
      <Card>
        <h2 class="text-lg font-semibold">Notes</h2>
        <p class="mt-3 whitespace-pre-wrap text-[var(--color-text-secondary)]">{match.notes}</p>
      </Card>
    {/if}
  {/if}
</section>
