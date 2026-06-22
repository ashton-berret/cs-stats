<script lang="ts">
  import { enhance } from "$app/forms";
  export let form: { message?: string };
  let loading = false;
</script>

<svelte:head>
  <title>Register - CS2 Casual Stats</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] px-4">
  <div class="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface-elevated)] p-8 shadow-lg">
    <h1 class="mb-2 text-center text-2xl font-bold text-[var(--color-text-primary)]">Create Account</h1>
    <p class="mb-8 text-center text-[var(--color-text-secondary)]">Start tracking your CS2 casual matches</p>

    {#if form?.message}
      <div class="mb-4 rounded-md border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
        {form.message}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          loading = false;
          await update();
        };
      }}
      class="space-y-4"
    >
      <label class="block">
        <span class="mb-2 block text-sm text-[var(--color-text-secondary)]">Username</span>
        <input type="text" name="username" required autocomplete="username" class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-4 py-2" />
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-[var(--color-text-secondary)]">Password</span>
        <input type="password" name="password" required autocomplete="new-password" class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-4 py-2" />
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-[var(--color-text-secondary)]">Confirm Password</span>
        <input type="password" name="confirmPassword" required autocomplete="new-password" class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-4 py-2" />
      </label>
      <button type="submit" disabled={loading} class="w-full rounded-md bg-[var(--color-primary)] px-4 py-2 font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
        {loading ? "Creating..." : "Create account"}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
      Already have an account?
      <a href="/login" class="font-medium text-[var(--color-primary)] hover:opacity-80">Sign in</a>
    </p>
  </div>
</div>
