<script lang="ts">
  import "../app.css";
  import { navigating, page } from "$app/stores";
  import { onMount } from "svelte";
  import PillNav from "$lib/components/layout/PillNav.svelte";
  import { theme } from "$lib/stores";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  const authPages = ["/login", "/register"];
  $: isAuthPage = authPages.includes($page.url.pathname);
  $: showNavigation = !!data.user && !isAuthPage;

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
  <PillNav user={data.user!} />

  <main class="min-h-screen bg-[var(--color-bg-base)] px-4 py-6 md:px-8">
    <div class="mx-auto max-w-7xl">
      <slot />
    </div>
  </main>
{:else}
  <slot />
{/if}
