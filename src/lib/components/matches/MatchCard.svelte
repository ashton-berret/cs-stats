<script lang="ts">
  import { mapColor } from "$lib/config/maps";
  import type { MatchSummary } from "$lib/types/match";

  export let match: MatchSummary;

  $: stat = match.stat;
  $: kd = stat.deaths === 0 ? stat.kills : stat.kills / stat.deaths;
  $: resultClass =
    match.result === "WIN"
      ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
      : match.result === "LOSS"
        ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
        : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]";

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  }
</script>

<a
  href={`/matches/${match.id}`}
  class="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface-elevated)] p-5 transition hover:border-[var(--color-primary)] hover:shadow-[0_0_18px_var(--color-primary-glow)]"
  style={`border-left: 4px solid ${mapColor(match.map)}`}
>
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-lg font-semibold text-[var(--color-text-primary)]">{match.map}</h2>
        <span class={`rounded px-2 py-1 text-xs font-semibold ${resultClass}`}>{match.result}</span>
      </div>
      <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
        {formatDate(match.playedAt)}
        {#if match.teamScore !== null && match.enemyScore !== null}
          <span> · {match.teamScore}-{match.enemyScore}</span>
        {/if}
      </p>
    </div>

    <div class="grid grid-cols-3 gap-4 text-right sm:min-w-64">
      <div>
        <div class="text-sm text-[var(--color-text-secondary)]">K/D/A</div>
        <div class="font-semibold">{stat.kills}/{stat.deaths}/{stat.assists}</div>
      </div>
      <div>
        <div class="text-sm text-[var(--color-text-secondary)]">K/D</div>
        <div class="font-semibold">{kd.toFixed(2)}</div>
      </div>
      <div>
        <div class="text-sm text-[var(--color-text-secondary)]">ADR</div>
        <div class="font-semibold">{stat.adr === null ? "-" : stat.adr.toFixed(1)}</div>
      </div>
    </div>
  </div>
</a>
