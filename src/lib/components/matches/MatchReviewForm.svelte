<script lang="ts">
  import { MAP_NAMES } from "$lib/config/maps";
  import type { MatchFormValues, MatchResult } from "$lib/types/match";
  import type { Team } from "$lib/types/parsing";

  export let action = "?/save";
  export let submitLabel = "Save match";
  export let values: Partial<MatchFormValues> = {};
  export let errors: Record<string, string> = {};
  export let message = "";

  const defaults: MatchFormValues = {
    map: MAP_NAMES[0] ?? "",
    mode: "Casual",
    playedAt: toDateTimeLocal(new Date()),
    teamScore: "",
    enemyScore: "",
    result: "WIN",
    durationMinutes: "",
    notes: "",
    parseSource: "manual",
    playerName: "",
    team: "OWN",
    kills: "0",
    deaths: "0",
    assists: "0",
    adr: "",
    hsPercent: "",
    mvps: "",
    hltvRating: "",
    enemiesFlashed: "",
    utilityDamage: "",
    score: "",
  };

  $: current = { ...defaults, ...values };

  function toDateTimeLocal(value: Date | string) {
    const date = typeof value === "string" ? new Date(value) : value;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function fieldClass(name: string) {
    return `w-full rounded-md border bg-[var(--color-bg-surface-overlay)] px-3 py-2 text-[var(--color-text-primary)] focus:outline-none ${
      errors[name] ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]" : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
    }`;
  }

  function errorFor(name: string) {
    return errors[name] ?? "";
  }

  const results: MatchResult[] = ["WIN", "LOSS", "TIE"];
  const teams: Team[] = ["OWN", "ENEMY"];
</script>

{#if message}
  <div class="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
    {message}
  </div>
{/if}

<form method="POST" {action} class="space-y-6">
  <input type="hidden" name="parseSource" value={current.parseSource} />

  <section class="grid gap-4 md:grid-cols-2">
    <label class="block">
      <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Map</span>
      <select name="map" required class={fieldClass("map")} value={current.map}>
        {#each MAP_NAMES as map}
          <option value={map}>{map}</option>
        {/each}
      </select>
      {#if errorFor("map")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("map")}</span>{/if}
    </label>

    <label class="block">
      <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Played at</span>
      <input name="playedAt" type="datetime-local" required value={current.playedAt} class={fieldClass("playedAt")} />
      {#if errorFor("playedAt")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("playedAt")}</span>{/if}
    </label>

    <label class="block">
      <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Mode</span>
      <input name="mode" value={current.mode} class={fieldClass("mode")} />
    </label>

    <label class="block">
      <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Result</span>
      <select name="result" required class={fieldClass("result")} value={current.result}>
        {#each results as result}
          <option value={result}>{result}</option>
        {/each}
      </select>
      {#if errorFor("result")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("result")}</span>{/if}
    </label>

    <label class="block">
      <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Your team score</span>
      <input name="teamScore" type="number" min="0" inputmode="numeric" value={current.teamScore} class={fieldClass("teamScore")} />
      {#if errorFor("teamScore")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("teamScore")}</span>{/if}
    </label>

    <label class="block">
      <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Enemy score</span>
      <input name="enemyScore" type="number" min="0" inputmode="numeric" value={current.enemyScore} class={fieldClass("enemyScore")} />
      {#if errorFor("enemyScore")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("enemyScore")}</span>{/if}
    </label>

    <label class="block">
      <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Duration minutes</span>
      <input name="durationMinutes" type="number" min="0" inputmode="numeric" value={current.durationMinutes} class={fieldClass("durationMinutes")} />
      {#if errorFor("durationMinutes")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("durationMinutes")}</span>{/if}
    </label>
  </section>

  <section class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
    <h2 class="mb-4 text-lg font-semibold">Your stat row</h2>
    <div class="grid gap-4 md:grid-cols-2">
      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Player name</span>
        <input name="playerName" required value={current.playerName} class={fieldClass("playerName")} />
        {#if errorFor("playerName")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("playerName")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Team</span>
        <select name="team" required class={fieldClass("team")} value={current.team}>
          {#each teams as team}
            <option value={team}>{team}</option>
          {/each}
        </select>
        {#if errorFor("team")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("team")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Kills</span>
        <input name="kills" type="number" min="0" required inputmode="numeric" value={current.kills} class={fieldClass("kills")} />
        {#if errorFor("kills")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("kills")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Deaths</span>
        <input name="deaths" type="number" min="0" required inputmode="numeric" value={current.deaths} class={fieldClass("deaths")} />
        {#if errorFor("deaths")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("deaths")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Assists</span>
        <input name="assists" type="number" min="0" required inputmode="numeric" value={current.assists} class={fieldClass("assists")} />
        {#if errorFor("assists")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("assists")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">ADR</span>
        <input name="adr" type="number" min="0" step="0.1" inputmode="decimal" value={current.adr} class={fieldClass("adr")} />
        {#if errorFor("adr")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("adr")}</span>{/if}
      </label>
    </div>
  </section>

  <details class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
    <summary class="cursor-pointer font-semibold text-[var(--color-text-primary)]">Extended stats</summary>
    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">HS percent</span>
        <input name="hsPercent" type="number" min="0" max="100" step="0.1" inputmode="decimal" value={current.hsPercent} class={fieldClass("hsPercent")} />
        {#if errorFor("hsPercent")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("hsPercent")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">MVPs</span>
        <input name="mvps" type="number" min="0" inputmode="numeric" value={current.mvps} class={fieldClass("mvps")} />
        {#if errorFor("mvps")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("mvps")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Rating</span>
        <input name="hltvRating" type="number" min="0" step="0.01" inputmode="decimal" value={current.hltvRating} class={fieldClass("hltvRating")} />
        {#if errorFor("hltvRating")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("hltvRating")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Enemies flashed</span>
        <input name="enemiesFlashed" type="number" min="0" inputmode="numeric" value={current.enemiesFlashed} class={fieldClass("enemiesFlashed")} />
        {#if errorFor("enemiesFlashed")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("enemiesFlashed")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Utility damage</span>
        <input name="utilityDamage" type="number" min="0" inputmode="numeric" value={current.utilityDamage} class={fieldClass("utilityDamage")} />
        {#if errorFor("utilityDamage")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("utilityDamage")}</span>{/if}
      </label>

      <label class="block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Score</span>
        <input name="score" type="number" min="0" inputmode="numeric" value={current.score} class={fieldClass("score")} />
        {#if errorFor("score")}<span class="mt-1 block text-xs text-[var(--color-danger)]">{errorFor("score")}</span>{/if}
      </label>
    </div>
  </details>

  <label class="block">
    <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">Notes</span>
    <textarea name="notes" rows="4" class={fieldClass("notes")}>{current.notes}</textarea>
  </label>

  <div class="flex flex-wrap gap-3">
    <button type="submit" class="rounded-md bg-[var(--color-primary)] px-5 py-2 font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)]">
      {submitLabel}
    </button>
    <a href="/matches" class="rounded-md border border-[var(--color-border)] px-5 py-2 text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
      Cancel
    </a>
  </div>
</form>
