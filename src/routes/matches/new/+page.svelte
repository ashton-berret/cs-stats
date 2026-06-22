<script lang="ts">
  import { Card } from "$lib/components/ui";
  import MatchReviewForm from "$lib/components/matches/MatchReviewForm.svelte";
  import ScoreboardUpload from "$lib/components/matches/ScoreboardUpload.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<section class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-[var(--color-text-primary)]">Add Match</h1>
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

    <MatchReviewForm
      action="?/save"
      submitLabel="Save match"
      values={form?.values ?? data.values}
      errors={form?.errors ?? {}}
      message={form?.message ?? ""}
      hiddenFields={form?.hiddenFields ?? []}
    />
  </Card>
</section>
