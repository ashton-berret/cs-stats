<script lang="ts">
  import "../app.css";
  import { navigating, page } from "$app/stores";
  import { onMount } from "svelte";
  import Navigation from "$lib/components/layout/Navigation.svelte";
  import { theme } from "$lib/stores";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let mobileNavOpen = false;

  const authPages = ["/login", "/register"];
  $: isAuthPage = authPages.includes($page.url.pathname);
  $: showNavigation = !!data.user && !isAuthPage;
  $: if ($navigating) mobileNavOpen = false;

  onMount(() => {
    theme.initialize();
  });
</script>

<svelte:head>
  <title>CS2 Casual Stats</title>
</svelte:head>

<div class="fixed left-0 right-0 top-0 z-50 h-1 bg-transparent">
  {#if $navigating}
    <div class="h-full w-full animate-pulse bg-[var(--color-primary)]"></div>
  {/if}
</div>

{#if showNavigation}
  <Navigation user={data.user!} mobileOpen={mobileNavOpen} onClose={() => (mobileNavOpen = false)} />

  <div class="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]/95 p-3 backdrop-blur md:hidden">
    <div class="flex items-center justify-between">
      <button
        type="button"
        class="rounded-md border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        on:click={() => (mobileNavOpen = true)}
      >
        Menu
      </button>
      <span class="font-semibold text-[var(--color-primary)]">CS2 Stats</span>
    </div>
  </div>

  <main class="min-h-screen bg-[var(--color-bg-base)] p-4 md:ml-64 md:p-8">
    <slot />
  </main>
{:else}
  <slot />
{/if}
