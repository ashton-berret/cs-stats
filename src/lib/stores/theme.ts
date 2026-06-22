import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { themeConfig, type ThemeMode } from "$lib/config/theme";

function createThemeStore() {
  const { subscribe, set, update } = writable<ThemeMode>(themeConfig.defaultTheme);

  function apply(theme: ThemeMode) {
    if (!browser) return;
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem(themeConfig.storageKey, theme);
  }

  return {
    subscribe,
    initialize: () => {
      if (!browser) return;
      const stored = localStorage.getItem(themeConfig.storageKey);
      const nextTheme: ThemeMode = stored === "light" ? "light" : "dark";
      set(nextTheme);
      apply(nextTheme);
    },
    toggle: () => {
      update((current) => {
        const next = current === "dark" ? "light" : "dark";
        apply(next);
        return next;
      });
    },
    setTheme: (theme: ThemeMode) => {
      set(theme);
      apply(theme);
    },
  };
}

export const theme = createThemeStore();
