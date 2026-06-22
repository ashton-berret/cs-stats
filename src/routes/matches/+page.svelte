<script lang="ts">
  import { Card } from "$lib/components/ui";
</script>

<section class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-[var(--color-text-primary)]">Matches</h1>
      <p class="mt-2 text-[var(--color-text-secondary)]">Saved CS2 casual matches will be listed here.</p>
    </div>
    <a
      href="/matches/new"
      class="rounded-md bg-[var(--color-primary)] px-4 py-2 text-center font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)]"
    >
      Add Match
    </a>
  </div>

  <Card>
    <p class="text-sm text-[var(--color-text-secondary)]">Manual match entry arrives in Phase 2.</p>
  </Card>
</section>
