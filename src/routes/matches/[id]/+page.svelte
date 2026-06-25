<script lang="ts">
  import { enhance } from "$app/forms";
  import { Card } from "$lib/components/ui";
  import MatchReviewForm from "$lib/components/matches/MatchReviewForm.svelte";
  import { ratingForMatch } from "$lib/utils/rating";
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
  $: rating = ratingForMatch(match);

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function pct(value: number | null | undefined) {
    return value === null || value === undefined ? "-" : `${value}%`;
  }

  // Rating 1.0 is centered on 1.0 = average pro; color it like the form tiers.
  function ratingColor(value: number) {
    if (value >= 1.3) return "#F2A900";
    if (value >= 1.1) return "#2ED573";
    if (value >= 0.95) return "#4A9EFF";
    if (value >= 0.8) return "#9B5DE5";
    return "#FF4757";
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
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Card>
        <div class="flex items-center gap-1.5">
          <p class="text-sm text-[var(--color-text-secondary)]">Rating 1.0</p>
          {#if rating?.estimated}
            <span class="rounded bg-[var(--color-warning)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-warning)]" title="Multi-kill term estimated — no per-round data for this match">est.</span>
          {/if}
          {#if rating}
            <span class="group relative inline-flex">
              <button
                type="button"
                class="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--color-border)] text-[10px] font-bold leading-none text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                aria-label="How this rating is calculated"
              >i</button>
              <span
                class="pointer-events-none absolute left-0 top-6 z-30 hidden w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface-elevated)] p-3.5 text-left text-xs leading-relaxed text-[var(--color-text-secondary)] shadow-2xl group-hover:block group-focus-within:block"
              >
                <span class="block font-semibold text-[var(--color-text-primary)]">HLTV Rating 1.0</span>
                <span class="mt-0.5 block font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">(Kill + 0.7·Survival + MultiKill) ÷ 2.7</span>
                <span class="mt-2 block">This match: <span class="text-[var(--color-text-primary)]">{rating.breakdown.kills}K / {rating.breakdown.deaths}D</span> over {rating.breakdown.rounds} rounds</span>
                <span class="mt-2 block space-y-0.5 font-[var(--font-mono)] text-[11px]">
                  <span class="flex justify-between"><span>Kill rating</span><span class="text-[var(--color-text-primary)]">{rating.breakdown.killRating.toFixed(2)}</span></span>
                  <span class="flex justify-between"><span>Survival rating</span><span class="text-[var(--color-text-primary)]">{rating.breakdown.survivalRating.toFixed(2)}</span></span>
                  <span class="flex justify-between"><span>Multi-kill rating</span><span class="text-[var(--color-text-primary)]">{rating.breakdown.multiKillRating.toFixed(2)}</span></span>
                </span>
                <span class="mt-1.5 block text-[10px] text-[var(--color-text-muted)]">
                  Each component is 1.0 at league average. Multi-kill term is {rating.estimated ? "estimated (no per-round data)" : "exact, from the round timeline"}.
                </span>
                <span class="mt-2 block border-t border-[var(--color-border)] pt-2">
                  = <span class="font-semibold text-[var(--color-text-primary)]">{rating.value.toFixed(2)}</span> raw{#if rating.casual !== rating.value} · ÷{rating.breakdown.casualFactor} = <span class="font-semibold text-[var(--color-text-primary)]">{rating.casual.toFixed(2)}</span> casual (10v10){/if}
                </span>
              </span>
            </span>
          {/if}
        </div>
        <p class="mt-2 text-2xl font-bold" style={`color:${rating ? ratingColor(rating.value) : "inherit"}`}>
          {rating ? rating.value.toFixed(2) : "-"}
        </p>
        {#if rating && rating.casual !== rating.value}
          <p class="mt-0.5 text-xs text-[var(--color-text-muted)]" title="Casual-calibrated (10v10 adjusted)">{rating.casual.toFixed(2)} casual</p>
        {/if}
      </Card>
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
          <div class="grid grid-cols-3 gap-3 text-sm">
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
              title={`Round ${round.round} · ${round.side ?? "side unknown"} · ${round.kills}K${round.headshots ? ` (${round.headshots} HS)` : ""} · ${
                round.won === true ? "won" : round.won === false ? "lost" : "result unknown"
              }${round.entryFragEst ? " · entry frag (est.)" : round.entryDeathEst ? " · entry death (est.)" : ""}`}
            >
              <span class="font-[var(--font-mono)] font-bold">{round.won === true ? "W" : round.won === false ? "L" : "?"}{round.round}</span>
              <span class={round.side === "CT" ? "text-[#6CA0DC]" : round.side === "T" ? "text-[#E0A93B]" : "text-[var(--color-text-muted)]"}>
                {round.entryFragEst ? "EF" : round.entryDeathEst ? "ED" : round.side ?? "-"}
              </span>
            </div>
          {/each}
        </div>

        <!-- Legend: the badges are terse, so spell out what each glyph means. -->
        <dl class="mt-5 grid gap-x-6 gap-y-2 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-secondary)] sm:grid-cols-2">
          <div class="flex gap-2"><dt class="font-[var(--font-mono)] font-bold text-[var(--color-text-primary)]">W# / L# / ?#</dt><dd>round number — won, lost, or result unknown</dd></div>
          <div class="flex gap-2"><dt class="font-[var(--font-mono)] font-bold text-[#6CA0DC]">CT</dt><dt class="font-[var(--font-mono)] font-bold text-[#E0A93B]">T</dt><dd>side you played that round</dd></div>
          <div class="flex gap-2"><dt class="font-[var(--font-mono)] font-bold text-[var(--color-text-primary)]">EF</dt><dd>entry frag — got the round's first kill (estimated)</dd></div>
          <div class="flex gap-2"><dt class="font-[var(--font-mono)] font-bold text-[var(--color-text-primary)]">ED</dt><dd>entry death — died first with no kill (estimated)</dd></div>
        </dl>
        <p class="mt-3 text-xs text-[var(--color-text-muted)]">
          Tip: W/L per round needs <code class="rounded bg-[var(--color-bg-surface-overlay)] px-1">map_round_wins</code> in your GSI config. If rounds show <code>?</code>, re-download the config from Settings.
        </p>
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
          <dt class="text-sm text-[var(--color-text-secondary)]">Rating 1.0</dt>
          <dd class="mt-1 font-medium">
            {rating ? `${rating.value.toFixed(2)}${rating.estimated ? " (est.)" : ""}` : "-"}
            {#if rating && rating.casual !== rating.value}<span class="text-[var(--color-text-muted)]"> · {rating.casual.toFixed(2)} casual</span>{/if}
          </dd>
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
