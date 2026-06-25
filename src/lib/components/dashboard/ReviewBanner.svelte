<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { relativeDate } from "$lib/utils/format";
  import type { PendingReview } from "$lib/types/match";

  // Server-rendered seed so the banner is correct on first paint; the poll keeps it live afterward.
  export let initial: PendingReview[] = [];
  // How often to check for newly-registered GSI matches while the dashboard stays open.
  export let pollMs = 20_000;

  let reviews = initial;
  // Matches the user has dismissed this session — hidden until they actually fill in the stats
  // (at which point the server stops returning them anyway).
  let dismissed = new Set<string>();
  let timer: ReturnType<typeof setInterval> | undefined;

  // Modal state: the match being reviewed plus its in-progress field values.
  let active: PendingReview | null = null;
  let form = { adr: "", hsPercent: "", utilityDamage: "", enemiesFlashed: "" };
  let saving = false;
  let saveError = "";

  $: visible = reviews.filter((r) => !dismissed.has(r.id));

  async function refresh() {
    try {
      const res = await fetch("/api/matches/pending-review");
      if (!res.ok) return;
      const data = (await res.json()) as { matches: PendingReview[] };
      reviews = data.matches;
    } catch {
      // Offline or dev server restarting — keep the last known list, try again next tick.
    }
  }

  function score(r: PendingReview): string {
    return r.teamScore !== null && r.enemyScore !== null ? `${r.teamScore}–${r.enemyScore}` : "";
  }

  function open(r: PendingReview) {
    active = r;
    form = { adr: "", hsPercent: "", utilityDamage: "", enemiesFlashed: "" };
    saveError = "";
  }

  function close() {
    active = null;
    saving = false;
  }

  async function save() {
    if (!active) return;
    saving = true;
    saveError = "";
    try {
      const res = await fetch(`/api/matches/${active.id}/manual-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        saveError = (await res.json().catch(() => null))?.message ?? "Couldn't save — check the values.";
        saving = false;
        return;
      }
      // Drop it from the list locally for instant feedback, then refresh stats/charts.
      reviews = reviews.filter((r) => r.id !== active!.id);
      close();
      await invalidateAll();
    } catch {
      saveError = "Network error — try again.";
      saving = false;
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  onMount(() => {
    refresh();
    timer = setInterval(refresh, pollMs);
  });
  onDestroy(() => clearInterval(timer));
</script>

<svelte:window on:keydown={onKeydown} />

{#if visible.length}
  <div class="anim-rise rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 p-4">
    <div class="mb-2 flex items-center gap-2">
      <span class="relative flex h-2.5 w-2.5">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary)] opacity-75"></span>
        <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]"></span>
      </span>
      <h2 class="font-[var(--font-display)] text-sm uppercase tracking-wide">
        {visible.length} {visible.length === 1 ? "match needs" : "matches need"} your stats
      </h2>
    </div>
    <p class="mb-3 text-xs text-[var(--color-text-secondary)]">
      Auto-captured from GSI. Click a match to add ADR / HS% / utility damage / flashes from the post-match scoreboard.
    </p>
    <ul class="flex flex-col gap-2">
      {#each visible as r (r.id)}
        <li class="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-bg-surface-overlay)] px-3 py-2">
          <button type="button" class="min-w-0 flex-1 text-left" on:click={() => open(r)}>
            <span class="font-semibold">{r.map}</span>
            <span class="text-[var(--color-text-muted)]"> · {r.mode}</span>
            {#if score(r)}<span class="font-[var(--font-mono)] text-[var(--color-text-secondary)]"> · {score(r)} {r.result}</span>{/if}
            <span class="text-[var(--color-text-muted)]"> · {relativeDate(r.playedAt)}</span>
          </button>
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              on:click={() => open(r)}
              class="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-semibold text-[#0e100f] hover:bg-[var(--color-primary-hover)]"
            >
              Add stats
            </button>
            <button
              type="button"
              class="rounded-full px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              on:click={() => (dismissed = new Set(dismissed).add(r.id))}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#if active}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" on:click={close}>
    <div
      class="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-xl"
      on:click|stopPropagation
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Add match stats"
    >
      <div class="mb-1 flex items-start justify-between gap-3">
        <h3 class="font-[var(--font-display)] text-lg">{active.map}</h3>
        <button type="button" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" on:click={close} aria-label="Close">✕</button>
      </div>
      <p class="mb-4 text-xs text-[var(--color-text-secondary)]">
        {active.mode}{#if score(active)} · {score(active)} {active.result}{/if} · {relativeDate(active.playedAt)} — type these from the scoreboard.
      </p>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1 block text-xs text-[var(--color-text-secondary)]">ADR</span>
          <!-- svelte-ignore a11y-autofocus -->
          <input
            type="number" min="0" step="0.1" inputmode="decimal" autofocus bind:value={form.adr}
            class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 focus:border-[var(--color-primary)] focus:outline-none"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-[var(--color-text-secondary)]">HS%</span>
          <input
            type="number" min="0" max="100" step="0.1" inputmode="decimal" bind:value={form.hsPercent}
            class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 focus:border-[var(--color-primary)] focus:outline-none"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-[var(--color-text-secondary)]">Utility damage</span>
          <input
            type="number" min="0" inputmode="numeric" bind:value={form.utilityDamage}
            class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 focus:border-[var(--color-primary)] focus:outline-none"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-[var(--color-text-secondary)]">Enemies flashed</span>
          <input
            type="number" min="0" inputmode="numeric" bind:value={form.enemiesFlashed}
            class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 focus:border-[var(--color-primary)] focus:outline-none"
          />
        </label>
      </div>

      {#if saveError}
        <p class="mt-3 text-xs text-[var(--color-danger)]">{saveError}</p>
      {/if}

      <div class="mt-5 flex items-center justify-between gap-3">
        <a href={`/matches/${active.id}`} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">Open full match →</a>
        <div class="flex gap-2">
          <button type="button" class="rounded-md px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" on:click={close}>
            Cancel
          </button>
          <button
            type="button"
            on:click={save}
            disabled={saving}
            class="rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[#0e100f] hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save stats"}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
