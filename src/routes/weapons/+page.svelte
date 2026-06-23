<script lang="ts">
  import { enhance } from "$app/forms";
  import { Card, Button } from "$lib/components/ui";
  import WeaponKills from "$lib/components/charts/WeaponKills.svelte";
  import WeaponAccuracy from "$lib/components/charts/WeaponAccuracy.svelte";
  import { CATEGORY_LABELS } from "$lib/components/charts/weapon-colors";
  import SourceTag from "$lib/components/dashboard/SourceTag.svelte";
  import { relativeDate } from "$lib/utils/format";
  import type { WeaponStat } from "$lib/types/weapons";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let refreshing = false;

  type SortKey = "kills" | "shots" | "hits" | "accuracy" | "display";
  let sortKey: SortKey = "kills";
  let sortDir: "desc" | "asc" = "desc";

  const columns: [SortKey, string][] = [
    ["display", "Weapon"],
    ["kills", "Kills"],
    ["shots", "Shots"],
    ["hits", "Hits"],
    ["accuracy", "Accuracy"],
  ];

  function setSort(key: SortKey) {
    if (sortKey === key) sortDir = sortDir === "desc" ? "asc" : "desc";
    else {
      sortKey = key;
      sortDir = key === "display" ? "asc" : "desc";
    }
  }

  function sortValue(weapon: WeaponStat, key: SortKey): number | string {
    if (key === "display") return weapon.display.toLowerCase();
    return weapon[key] ?? -1;
  }

  $: snapshot = data.snapshot;
  $: sortedWeapons = snapshot
    ? [...snapshot.weapons].sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : [];

  function fmt(value: number | null, suffix = ""): string {
    return value === null ? "—" : `${value.toLocaleString()}${suffix}`;
  }
</script>

<section class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="font-[var(--font-display)] text-3xl font-bold uppercase tracking-wide text-[var(--color-text-primary)]">Weapons</h1>
        <SourceTag label="Lifetime · Steam" />
      </div>
      <p class="mt-2 text-[var(--color-text-secondary)]">Lifetime, all-modes per-weapon stats from your Steam CS2 profile — not limited to tracked casual matches.</p>
    </div>
    {#if data.steamId}
      <form
        method="POST"
        action="?/refresh"
        use:enhance={() => {
          refreshing = true;
          return async ({ update }) => {
            await update();
            refreshing = false;
          };
        }}
      >
        <Button type="submit" disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh from Steam"}</Button>
      </form>
    {/if}
  </div>

  {#if form && "message" in form && form.message}
    <Card>
      <p class="text-sm text-[#FF4757]">{form.message}</p>
    </Card>
  {/if}

  {#if !data.steamId}
    <Card>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold">Connect your Steam profile</h2>
          <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
            Add your SteamID64 in Settings to pull weapon stats. Your CS2 profile's game details must be public.
          </p>
        </div>
        <a href="/settings" class="rounded-full bg-[var(--color-primary)] px-4 py-2 text-center font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)]">
          Go to Settings
        </a>
      </div>
    </Card>
  {:else if data.error && !snapshot}
    <Card>
      <h2 class="text-lg font-semibold text-[#FF4757]">Couldn't load stats</h2>
      <p class="mt-1 text-sm text-[var(--color-text-secondary)]">{data.error}</p>
    </Card>
  {:else if snapshot}
    <!-- Overall cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Total kills</p>
        <p class="mt-2 text-3xl font-bold">{fmt(snapshot.overall.totalKills)}</p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">K/D {snapshot.overall.kd.toFixed(2)}</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Headshot %</p>
        <p class="mt-2 text-3xl font-bold">{snapshot.overall.hsPercent === null ? "—" : `${snapshot.overall.hsPercent}%`}</p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{fmt(snapshot.overall.headshotKills)} HS kills</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Accuracy</p>
        <p class="mt-2 text-3xl font-bold">{snapshot.overall.accuracy === null ? "—" : `${snapshot.overall.accuracy}%`}</p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{fmt(snapshot.overall.totalShots)} shots fired</p>
      </Card>
      <Card>
        <p class="text-sm text-[var(--color-text-secondary)]">Matches</p>
        <p class="mt-2 text-3xl font-bold">{fmt(snapshot.overall.matchesPlayed)}</p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{fmt(snapshot.overall.hoursPlayed)} h played</p>
      </Card>
    </div>

    <p class="text-xs text-[var(--color-text-secondary)]">Updated {relativeDate(snapshot.capturedAt)} · SteamID {snapshot.steamId64}</p>

    <!-- Charts -->
    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 class="mb-2 text-lg font-semibold">Top weapons by kills</h2>
        <WeaponKills weapons={snapshot.weapons} />
      </Card>
      <Card>
        <h2 class="mb-2 text-lg font-semibold">Accuracy by weapon</h2>
        <WeaponAccuracy weapons={snapshot.weapons} />
      </Card>
    </div>

    <!-- Sortable table -->
    <Card>
      <h2 class="mb-3 text-lg font-semibold">All weapons</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[var(--color-border)] text-left text-[var(--color-text-secondary)]">
              {#each columns as [key, label]}
                <th class="py-2 pr-4">
                  <button type="button" class="font-medium hover:text-[var(--color-primary)]" on:click={() => setSort(key)}>
                    {label}{#if sortKey === key}<span class="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>{/if}
                  </button>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each sortedWeapons as weapon}
              <tr class="border-b border-[var(--color-border)]/50">
                <td class="py-2 pr-4">
                  <span class="font-medium">{weapon.display}</span>
                  <span class="ml-2 text-xs text-[var(--color-text-secondary)]">{CATEGORY_LABELS[weapon.category]}</span>
                </td>
                <td class="py-2 pr-4 tabular-nums">{weapon.kills.toLocaleString()}</td>
                <td class="py-2 pr-4 tabular-nums">{weapon.shots === null ? "—" : weapon.shots.toLocaleString()}</td>
                <td class="py-2 pr-4 tabular-nums">{weapon.hits === null ? "—" : weapon.hits.toLocaleString()}</td>
                <td class="py-2 pr-4 tabular-nums">{weapon.accuracy === null ? "—" : `${weapon.accuracy}%`}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
</section>
