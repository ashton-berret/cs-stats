<script lang="ts">
  import { theme } from "$lib/stores";
  import { Card } from "$lib/components/ui";
</script>

<section class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-[var(--color-text-primary)]">Settings</h1>
    <p class="mt-2 text-[var(--color-text-secondary)]">Parser, profile, and theme settings will be completed in Phase 6.</p>
  </div>

  <Card>
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="font-semibold">Theme</h2>
        <p class="mt-1 text-sm text-[var(--color-text-secondary)]">Toggle the local CS2 theme preference.</p>
      </div>
      <button
        type="button"
        class="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        on:click={() => theme.toggle()}
      >
        Toggle
      </button>
    </div>
  </Card>
</section>
