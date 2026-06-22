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
  $: kd = stat.deaths === 0 ? stat.kills : stat.kills / stat.deaths;
  $: score = match.teamScore !== null && match.enemyScore !== null ? `${match.teamScore}-${match.enemyScore}` : "No score";

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }
</script>

<section class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <a href="/matches" class="text-sm text-[var(--color-primary)] hover:opacity-80">Back to matches</a>
      <h1 class="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">{match.map}</h1>
      <p class="mt-2 text-[var(--color-text-secondary)]">{formatDate(match.playedAt)} · {score} · {match.result}</p>
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
