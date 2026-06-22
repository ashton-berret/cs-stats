<script lang="ts">
  import { Card } from "$lib/components/ui";
  import MatchReviewForm from "$lib/components/matches/MatchReviewForm.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<section class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-[var(--color-text-primary)]">Add Match</h1>
    <p class="mt-2 text-[var(--color-text-secondary)]">Enter a CS2 casual match manually.</p>
  </div>

  <Card>
    <MatchReviewForm
      action="?/save"
      submitLabel="Save match"
      values={form?.values ?? data.values}
      errors={form?.errors ?? {}}
      message={form?.message ?? ""}
    />
  </Card>
</section>
