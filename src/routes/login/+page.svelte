<script lang="ts">
  import { enhance } from "$app/forms";
  export let form: { message?: string };
  let loading = false;
</script>

<svelte:head>
  <title>Login - CS2 Casual Stats</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] px-4">
  <div class="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface-elevated)] p-8 shadow-lg">
    <h1 class="mb-2 text-center text-2xl font-bold text-[var(--color-text-primary)]">Welcome Back</h1>
    <p class="mb-8 text-center text-[var(--color-text-secondary)]">Sign in to CS2 Casual Stats</p>

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
        <input
          type="text"
          name="username"
          required
          autocomplete="username"
          class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-4 py-2"
        />
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-[var(--color-text-secondary)]">Password</span>
        <input
          type="password"
          name="password"
          required
          autocomplete="current-password"
          class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-4 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        class="w-full rounded-full bg-[var(--color-primary)] px-4 py-2 font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
      Don't have an account?
      <a href="/register" class="font-medium text-[var(--color-primary)] hover:opacity-80">Create one</a>
    </p>
  </div>
</div>
