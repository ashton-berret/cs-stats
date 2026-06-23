<script lang="ts">
  import { page } from "$app/stores";
  import { theme } from "$lib/stores";

  export let user: { id: string; username: string };

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/matches", label: "Matches" },
    { href: "/matches/new", label: "Add" },
    { href: "/weapons", label: "Weapons" },
    { href: "/settings", label: "Settings" },
  ];

  $: path = $page.url.pathname;

  function isActive(href: string) {
    if (href === "/matches") return path === "/matches" || (path.startsWith("/matches/") && path !== "/matches/new");
    return path === href;
  }
</script>

<header class="sticky top-0 z-30 px-4 pt-4 md:px-8">
  <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
    <a href="/dashboard" class="flex shrink-0 items-center gap-2">
      <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] font-[var(--font-display)] text-lg font-bold text-[#0e100f]">C</span>
      <span class="hidden font-[var(--font-display)] text-lg font-semibold tracking-wide sm:block">CS2<span class="text-[var(--color-primary)]">STATS</span></span>
    </a>

    <nav class="pillbar flex items-center gap-1 overflow-x-auto p-1">
      {#each navItems as item}
        <a
          href={item.href}
          class={`pill px-4 py-2 text-sm font-medium ${isActive(item.href) ? "pill-active" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label="Toggle theme"
        class="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        on:click={() => theme.toggle()}
      >
        {$theme === "light" ? "☾" : "☀"}
      </button>
      <form method="POST" action="/logout" class="hidden sm:block">
        <button
          type="submit"
          class="flex h-9 items-center rounded-full border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          Logout
        </button>
      </form>
      <span class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-secondary)] text-sm font-bold text-white" title={user.username}>
        {user.username.slice(0, 1).toUpperCase()}
      </span>
    </div>
  </div>
</header>
