<script lang="ts">
  import { Card } from "$lib/components/ui";
</script>

<section class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
    <p class="mt-2 text-[var(--color-text-secondary)]">Your match summary and charts will appear here.</p>
  </div>

  <Card>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold">No matches yet</h2>
        <p class="mt-1 text-sm text-[var(--color-text-secondary)]">Add a match manually in Phase 2 to start tracking trends.</p>
      </div>
      <a
        href="/matches/new"
        class="rounded-md bg-[var(--color-primary)] px-4 py-2 text-center font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)]"
      >
        Add Match
      </a>
    </div>
  </Card>
</section>
