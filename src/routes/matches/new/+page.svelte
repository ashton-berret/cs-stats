<script lang="ts">
  import { Card } from "$lib/components/ui";
  import MatchReviewForm from "$lib/components/matches/MatchReviewForm.svelte";
  import ScoreboardUpload from "$lib/components/matches/ScoreboardUpload.svelte";
  import type { MatchFormValues } from "$lib/types/match";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: duplicate = form?.duplicate ?? null;
  $: reviewedValues = form?.values ?? data.values;

  function valueFields(values: Partial<MatchFormValues>) {
    return Object.entries(values).map(([name, value]) => ({ name, value: value === null || value === undefined ? "" : String(value) }));
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }
</script>

<section class="space-y-6">
  <div>
    <h1 class="font-[var(--font-display)] text-3xl font-bold uppercase tracking-wide text-[var(--color-text-primary)]">Add Match</h1>
    <p class="mt-2 text-[var(--color-text-secondary)]">Parse cropped scoreboard screenshots or enter the match manually.</p>
  </div>

  <Card>
    <div class="mb-6">
      <h2 class="mb-3 text-lg font-semibold">Parse screenshots</h2>
      <ScoreboardUpload playerName={form?.playerName ?? data.playerName} />
      {#if form?.warnings?.length}
        <div class="mt-4 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
          {#each form.warnings as warning}
            <p>{warning}</p>
          {/each}
        </div>
      {/if}
    </div>

    <div class="mb-6 border-t border-[var(--color-border)]"></div>

    {#if duplicate}
      <div class="mb-6 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 p-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-sm font-semibold text-[var(--color-primary)]">
              Possible duplicate {duplicate.confidence === "high" ? "found" : "candidate"}
            </p>
            <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
              {duplicate.candidateSummary.map}
              {#if duplicate.candidateSummary.teamScore !== null && duplicate.candidateSummary.enemyScore !== null}
                - {duplicate.candidateSummary.teamScore}-{duplicate.candidateSummary.enemyScore}
              {/if}
              - {formatDate(duplicate.candidateSummary.playedAt)}
              - {duplicate.candidateSummary.parseSource.toUpperCase()}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <form method="POST" action="?/merge">
              <input type="hidden" name="candidateId" value={duplicate.candidateId} />
              {#each valueFields(reviewedValues) as field}
                <input type="hidden" name={field.name} value={field.value} />
              {/each}
              {#each form?.hiddenFields ?? [] as field}
                <input type="hidden" name={field.name} value={field.value} />
              {/each}
              <button type="submit" class="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[#0e100f] hover:bg-[var(--color-primary-hover)]">
                Merge into existing GSI match
              </button>
            </form>
            <form method="POST" action="?/save">
              <input type="hidden" name="skipDedup" value="1" />
              {#each valueFields(reviewedValues) as field}
                <input type="hidden" name={field.name} value={field.value} />
              {/each}
              {#each form?.hiddenFields ?? [] as field}
                <input type="hidden" name={field.name} value={field.value} />
              {/each}
              <button type="submit" class="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                Save as separate match
              </button>
            </form>
          </div>
        </div>
      </div>
    {/if}

    <MatchReviewForm
      action="?/save"
      submitLabel="Save match"
      values={reviewedValues}
      errors={form?.errors ?? {}}
      message={form?.message ?? ""}
      hiddenFields={form?.hiddenFields ?? []}
    />
  </Card>
</section>
