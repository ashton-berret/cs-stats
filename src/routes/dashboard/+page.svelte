<script lang="ts">
  import KDTrend from "$lib/components/charts/KDTrend.svelte";
  import AdrTrend from "$lib/components/charts/AdrTrend.svelte";
  import HsTrend from "$lib/components/charts/HsTrend.svelte";
  import ResultsDonut from "$lib/components/charts/ResultsDonut.svelte";
  import PerformanceByMap from "$lib/components/charts/PerformanceByMap.svelte";
  import SidePerformance from "$lib/components/charts/SidePerformance.svelte";
  import EntryImpactTrend from "$lib/components/charts/EntryImpactTrend.svelte";
  import TopWeaponsMini from "$lib/components/charts/TopWeaponsMini.svelte";
  import PerformanceRadar from "$lib/components/dashboard/PerformanceRadar.svelte";
  import StatChip from "$lib/components/dashboard/StatChip.svelte";
  import FeatureCard from "$lib/components/dashboard/FeatureCard.svelte";
  import FilterPills from "$lib/components/dashboard/FilterPills.svelte";
  import MatchHeatmap from "$lib/components/dashboard/MatchHeatmap.svelte";
  import ReviewBanner from "$lib/components/dashboard/ReviewBanner.svelte";
  import SourceTag from "$lib/components/dashboard/SourceTag.svelte";
  import { goto } from "$app/navigation";
  import { relativeDate } from "$lib/utils/format";
  import { buildPerformanceMetrics, computeFormScore } from "$lib/utils/performance";
  import type { MatchResult } from "$lib/types/match";
  import type { PageData } from "./$types";

  export let data: PageData;

  function selectMode(mode: string) {
    pendingMode = mode;
    goto(mode === "All" ? "/dashboard" : `/dashboard?mode=${encodeURIComponent(mode)}`, { keepFocus: true, noScroll: true });
  }

  const SECTION_LABELS = ["Aim", "Weapons", "Maps", "Form"];
  const SECTION_IDS: Record<string, string> = { Aim: "sec-aim", Weapons: "sec-weapons", Maps: "sec-maps", Form: "sec-form" };
  let activeSection = "Aim";
  let pendingMode: string | null = null;

  function scrollToSection(label: string) {
    activeSection = label;
    document.getElementById(SECTION_IDS[label])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $: stats = data.stats;
  // Optimistically highlight the clicked mode until the server load catches up to it.
  $: if (pendingMode && data.activeMode === pendingMode) pendingMode = null;
  $: selectedMode = pendingMode ?? data.activeMode;

  const RESULT_STYLES: Record<MatchResult, { label: string; class: string }> = {
    WIN: { label: "W", class: "bg-[#2ED573] text-[#0e100f]" },
    LOSS: { label: "L", class: "bg-[#FF4757] text-white" },
    TIE: { label: "T", class: "bg-[#F2A900] text-[#0e100f]" },
  };

  function fmt(value: number | null, suffix = ""): string {
    return value === null ? "—" : `${value}${suffix}`;
  }
  const resultWord = (r: MatchResult) => (r === "WIN" ? "Win" : r === "LOSS" ? "Loss" : "Tie");

  // Build the `pb` prop for a StatChip from a PersonalBest record (best single-match value + link).
  function pbProp(best: { value: number; matchId: string; map: string; playedAt: string } | null, format: (v: number) => string, label: string | null = null) {
    if (!best) return null;
    return {
      value: format(best.value),
      href: `/matches/${best.matchId}`,
      title: `Best ${label ?? "result"}: ${format(best.value)} — ${best.map}, ${relativeDate(best.playedAt)}`,
      label: label ?? undefined,
    };
  }

  function metricDelta(value: number, suffix: string, decimals: number) {
    const abs = Math.abs(value).toFixed(decimals);
    return {
      value: `${abs}${suffix}`,
      direction: value > 0 ? "up" : value < 0 ? "down" : "flat",
    } as const;
  }

  // Normalized 0–100 performance metrics (drives the radar + Form score).
  $: perfMetrics = buildPerformanceMetrics(
    {
      hsPercent: stats.avgHsPercent,
      adr: stats.avgAdr,
      kd: stats.kdRatio,
      winRate: stats.winRate,
      utilityDamage: stats.avgUtilityDamage,
    },
    data.activeMode, // "All" → casual-calibrated (the default treatment)
  );
  $: form = computeFormScore(perfMetrics);
  $: ctPerformance = stats.sidePerformance.find((entry) => entry.side === "CT") ?? null;
  $: tPerformance = stats.sidePerformance.find((entry) => entry.side === "T") ?? null;
  $: winDelta = stats.momentum ? metricDelta(stats.momentum.delta, "pp", 1) : null;
  $: kdDelta = stats.momentum ? metricDelta(stats.momentum.kdDelta, "", 2) : null;
  $: streak = stats.streaks.current;
  $: currentStreakText = streak ? `${streak.count} ${streak.result === "WIN" ? "wins" : "losses"}` : "none";
  $: bestStreakText =
    stats.streaks.longestWin === 0 && stats.streaks.longestLoss === 0
      ? "none"
      : stats.streaks.longestWin >= stats.streaks.longestLoss
      ? `${stats.streaks.longestWin} wins`
      : `${stats.streaks.longestLoss} losses`;

  // Right-rail feature cards.
  $: bestWeapon = data.topWeapons[0] ?? null;
  $: kdSpark = stats.kdTrend.map((p) => p.kd);
</script>

<section class="space-y-7">
  <!-- Hero + mode filter -->
  <div class="anim-rise flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p class="text-sm uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Track your</p>
      <h1 class="font-[var(--font-display)] text-4xl font-bold uppercase leading-[1.05] tracking-wide sm:text-5xl">
        CS2 <span class="text-[var(--color-primary)]">Performance</span>
      </h1>
    </div>
    <FilterPills options={data.modes} selected={selectedMode} onSelect={selectMode} />
  </div>

  <!-- Live prompt for GSI matches still missing manually-entered stats. -->
  <ReviewBanner initial={data.pendingReviews} />

  {#if stats.totalMatches === 0}
    <div class="glass-card anim-rise flex flex-col items-start gap-4 p-8">
      <h2 class="font-[var(--font-display)] text-2xl">No matches yet</h2>
      <p class="text-[var(--color-text-secondary)]">Add your first match to power up your performance index.</p>
      <a href="/matches/new" class="rounded-full bg-[var(--color-primary)] px-5 py-2.5 font-semibold text-[#0e100f] hover:bg-[var(--color-primary-hover)]">
        Add your first match
      </a>
    </div>
  {:else}
    <!-- category pills (jump to section) -->
    <div class="anim-rise" style="animation-delay:60ms">
      <FilterPills options={SECTION_LABELS} bind:selected={activeSection} size="sm" onSelect={scrollToSection} />
    </div>

    <!-- Command center: stats | radar | feature cards -->
    <div class="grid gap-5 lg:grid-cols-12">
      <!-- left rail -->
      <div class="order-2 space-y-4 lg:order-1 lg:col-span-3">
        <div class="anim-rise" style="animation-delay:60ms">
          <StatChip label="HLTV Rating 1.0" value={stats.avgHltvRating === null ? "—" : stats.avgHltvRating.toFixed(2)} sub={stats.avgRatingCasual === null ? "raw · 1.0 = pro avg" : `${stats.avgRatingCasual.toFixed(2)} casual-adj`} icon="✦" color="#F2A900" pb={pbProp(stats.personalBests.rating, (v) => v.toFixed(2))} />
        </div>
        <div class="anim-rise" style="animation-delay:80ms">
          <StatChip
            label="K/D Ratio"
            value={stats.kdRatio.toFixed(2)}
            sub={`${stats.totalKills} K / ${stats.totalDeaths} D`}
            icon="⚔"
            delta={kdDelta}
            pb={[pbProp(stats.personalBests.kd, (v) => v.toFixed(2), "K/D"), pbProp(stats.personalBests.kills, (v) => String(v), "Kills")].filter((b) => b !== null)}
          />
        </div>
        <div class="anim-rise" style="animation-delay:140ms">
          <StatChip label="Avg ADR" value={fmt(stats.avgAdr)} icon="◎" color="#4A9EFF" pb={pbProp(stats.personalBests.adr, (v) => String(Math.round(v)))} />
        </div>
        <div class="anim-rise" style="animation-delay:200ms">
          <StatChip label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.wins}W · ${stats.losses}L · ${stats.ties}T`} icon="★" color="#2ED573" delta={winDelta} />
        </div>
        <div class="anim-rise" style="animation-delay:230ms">
          <div class="glass-card lift grid grid-cols-2 gap-3 px-4 py-3.5">
            <div class="flex min-w-0 items-center gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#6CA0DC] text-sm font-bold text-[#0e100f]">CT</span>
              <div class="min-w-0">
                <p class="truncate text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Win Rate</p>
                <p class="font-[var(--font-mono)] text-xl leading-tight text-[var(--color-text-primary)]">{ctPerformance ? `${ctPerformance.winRate}%` : "—"}</p>
                <p class="truncate text-xs text-[var(--color-text-muted)]">{ctPerformance ? `${ctPerformance.matches} matches` : "No matches"}</p>
              </div>
            </div>
            <div class="flex min-w-0 items-center gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E0A93B] text-sm font-bold text-[#0e100f]">T</span>
              <div class="min-w-0">
                <p class="truncate text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Win Rate</p>
                <p class="font-[var(--font-mono)] text-xl leading-tight text-[var(--color-text-primary)]">{tPerformance ? `${tPerformance.winRate}%` : "—"}</p>
                <p class="truncate text-xs text-[var(--color-text-muted)]">{tPerformance ? `${tPerformance.matches} matches` : "No matches"}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="anim-rise" style="animation-delay:260ms">
          <StatChip label="Headshot %" value={fmt(stats.avgHsPercent, "%")} icon="◬" color="#9B5DE5" pb={pbProp(stats.personalBests.hsPercent, (v) => `${Math.round(v)}%`)} />
        </div>

        <!-- current form mini module -->
        <div id="sec-form" class="glass-card anim-rise scroll-mt-24 p-4" style="animation-delay:280ms">
          <div class="flex items-center justify-between">
            <p class="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Current form</p>
            <span class="font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">LAST {stats.recentForm.length}</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-1.5">
            {#each [...stats.recentForm].reverse() as result}
              <span class={`flex h-7 w-7 items-center justify-center rounded-lg font-[var(--font-mono)] text-xs font-bold ${RESULT_STYLES[result].class}`}>
                {RESULT_STYLES[result].label}
              </span>
            {/each}
          </div>
          <p class="mt-3 text-xs text-[var(--color-text-muted)]">Current streak: {currentStreakText} · Best streak: {bestStreakText}</p>
        </div>
      </div>

      <!-- center radar -->
      <div class="glass-card anim-rise order-1 p-6 lg:order-2 lg:col-span-6" style="animation-delay:100ms">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Form score</p>
            <p class="font-[var(--font-mono)] text-4xl leading-none" style={`color:${form.color}`}>
              {form.score}<span class="text-lg text-[var(--color-text-muted)]">/100</span>
            </p>
            <p class="mt-1 text-sm font-semibold" style={`color:${form.color}`}>{form.tier}</p>
          </div>
          <span class="rounded-full bg-[var(--color-primary)]/15 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">{stats.totalMatches} matches</span>
        </div>
        <PerformanceRadar metrics={perfMetrics} />
      </div>

      <!-- right rail: colorful feature cards -->
      <div class="order-3 space-y-4 lg:col-span-3">
        {#if data.recentMatch}
          <div class="anim-rise" style="animation-delay:160ms">
            <FeatureCard
              label="Recent Match"
              value={`${data.recentMatch.map} ${resultWord(data.recentMatch.result)}`}
              sub={`${data.recentMatch.stat.kills}/${data.recentMatch.stat.deaths}/${data.recentMatch.stat.assists} · ${relativeDate(data.recentMatch.playedAt)}`}
              gradient="linear-gradient(135deg,#F2683C,#E0432F)"
              spark={kdSpark}
              href="/matches"
            />
          </div>
        {/if}
        {#if bestWeapon}
          <div class="anim-rise" style="animation-delay:220ms">
            <FeatureCard
              label="Best Weapon"
              value={`${bestWeapon.display} Mastery`}
              sub={`${bestWeapon.kills.toLocaleString()} kills · ${bestWeapon.accuracy === null ? "—" : bestWeapon.accuracy + "%"} acc`}
              gradient="linear-gradient(135deg,#7C5CFC,#5B3FE0)"
              spark={data.topWeapons.slice(0, 6).map((w) => w.kills)}
              href="/weapons"
              tag="Lifetime · Steam"
            />
          </div>
        {/if}
        <div class="glass-card anim-rise scroll-mt-24 p-5" style="animation-delay:280ms">
          <MatchHeatmap days={data.activity.slice(-112)} cell={11} title="Match heatmap" />
        </div>
      </div>
    </div>

    <!-- Trends -->
    <div class="grid gap-5 lg:grid-cols-2">
      <div id="sec-aim" class="glass-card anim-rise scroll-mt-24 p-5 lg:col-span-2" style="animation-delay:120ms">
        <h2 class="mb-3 font-[var(--font-display)] text-lg">K/D Trend</h2>
        <KDTrend data={stats.kdTrend} />
      </div>
      <div id="sec-maps" class="glass-card anim-rise scroll-mt-24 p-5" style="animation-delay:140ms">
        <h2 class="mb-3 font-[var(--font-display)] text-lg">Performance by map</h2>
        <PerformanceByMap data={stats.performanceByMap} />
      </div>
      <div class="glass-card anim-rise p-5" style="animation-delay:150ms">
        <h2 class="mb-3 font-[var(--font-display)] text-lg">Side performance</h2>
        {#if stats.sidePerformanceByMap.length}
          <SidePerformance data={stats.sidePerformanceByMap} />
        {:else}
          <p class="py-12 text-center text-sm text-[var(--color-text-secondary)]">No CT/T side data recorded yet.</p>
        {/if}
      </div>
      <div class="glass-card anim-rise p-5" style="animation-delay:160ms">
        <h2 class="mb-3 font-[var(--font-display)] text-lg">Results</h2>
        <ResultsDonut data={stats.resultBreakdown} />
      </div>
      {#if stats.entryImpact}
        <div class="glass-card anim-rise p-5 lg:col-span-2" style="animation-delay:170ms">
          <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="font-[var(--font-display)] text-lg">Entry impact</h2>
              <p class="text-sm text-[var(--color-text-secondary)]">Entry (est.) and survival from GSI round records.</p>
            </div>
            <div class="grid grid-cols-3 gap-3 text-right text-sm">
              <div>
                <p class="text-[var(--color-text-secondary)]">Entry success</p>
                <p class="font-[var(--font-mono)] text-lg">{stats.entryImpact.entrySuccessRate === null ? "—" : `${stats.entryImpact.entrySuccessRate}%`}</p>
              </div>
              <div>
                <p class="text-[var(--color-text-secondary)]">Survival</p>
                <p class="font-[var(--font-mono)] text-lg">{stats.entryImpact.survivalRate}%</p>
              </div>
              <div>
                <p class="text-[var(--color-text-secondary)]">Entry deaths</p>
                <p class="font-[var(--font-mono)] text-lg">{stats.entryImpact.entryDeaths}</p>
              </div>
            </div>
          </div>
          <EntryImpactTrend data={stats.entryImpact.trend} />
        </div>
      {/if}
      <div class="glass-card anim-rise p-5" style="animation-delay:180ms">
        <h2 class="mb-3 font-[var(--font-display)] text-lg">ADR trend</h2>
        {#if stats.adrTrend.length}
          <AdrTrend data={stats.adrTrend} />
        {:else}
          <p class="py-12 text-center text-sm text-[var(--color-text-secondary)]">No ADR recorded yet.</p>
        {/if}
      </div>
      <div class="glass-card anim-rise p-5" style="animation-delay:200ms">
        <h2 class="mb-3 font-[var(--font-display)] text-lg">Headshot % trend</h2>
        {#if stats.hsTrend.length}
          <HsTrend data={stats.hsTrend} />
        {:else}
          <p class="py-12 text-center text-sm text-[var(--color-text-secondary)]">No headshot % recorded yet.</p>
        {/if}
      </div>
      {#if data.topWeapons.length}
        <div id="sec-weapons" class="glass-card anim-rise scroll-mt-24 p-5 lg:col-span-2" style="animation-delay:220ms">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 class="font-[var(--font-display)] text-lg">Top weapons</h2>
              <SourceTag label="Lifetime · Steam" />
            </div>
            <a href="/weapons" class="text-sm font-medium text-[var(--color-primary)] hover:opacity-80">View all →</a>
          </div>
          <TopWeaponsMini weapons={data.topWeapons} />
        </div>
      {/if}
    </div>
  {/if}
</section>
