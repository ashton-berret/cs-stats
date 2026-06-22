<script lang="ts">
  import { enhance } from "$app/forms";
  import { onDestroy } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";

  export let playerName = "";

  let page1Name = "";
  let page2Name = "";
  let page1Preview = "";
  let page2Preview = "";
  let pasteTarget: 1 | 2 = 1;
  let page1Input: HTMLInputElement;
  let page2Input: HTMLInputElement;
  let isParsing = false;
  let elapsedSeconds = 0;
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;

  const parseForm: SubmitFunction = () => {
    startParsing();

    return async ({ update }) => {
      stopParsing();
      await update();
    };
  };

  onDestroy(stopParsing);

  function fileFromEvent(event: Event, page: 1 | 2) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) setFile(page, file, false);
  }

  function dropFile(event: DragEvent, page: 1 | 2) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith("image/")) setFile(page, file);
  }

  function pasteImage(event: ClipboardEvent) {
    const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (file) setFile(pasteTarget, file);
  }

  function setFile(page: 1 | 2, file: File, syncInput = true) {
    if (syncInput) {
      const input = page === 1 ? page1Input : page2Input;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (page === 1) {
        page1Name = file.name || "Pasted image";
        page1Preview = String(reader.result);
      } else {
        page2Name = file.name || "Pasted image";
        page2Preview = String(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function startParsing() {
    stopTimer();
    isParsing = true;
    elapsedSeconds = 0;
    elapsedTimer = setInterval(() => {
      elapsedSeconds += 1;
    }, 1000);
  }

  function stopParsing() {
    isParsing = false;
    stopTimer();
  }

  function stopTimer() {
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  }
</script>

<form method="POST" action="?/parse" enctype="multipart/form-data" class="space-y-4" on:paste={pasteImage} use:enhance={parseForm} aria-busy={isParsing}>
  <label class="block max-w-md">
    <span class="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">Player name to find</span>
    <input
      type="text"
      name="parsePlayerName"
      value={playerName}
      class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
      placeholder="neovimbtw"
      disabled={isParsing}
    />
  </label>

  <div class="grid gap-4 md:grid-cols-2">
    <label
      class="block rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 transition hover:border-[var(--color-primary)]"
      on:dragover|preventDefault
      on:drop={(event) => dropFile(event, 1)}
    >
      <span class="mb-2 block font-semibold">Page 1: K / D / A / MVPs / Score</span>
      <span class="mb-3 block text-sm text-[var(--color-text-secondary)]">Drop, choose, or paste the first cropped scoreboard page.</span>
      <input bind:this={page1Input} type="file" name="page1" accept="image/*" class="block w-full text-sm text-[var(--color-text-secondary)]" on:change={(event) => fileFromEvent(event, 1)} on:focus={() => (pasteTarget = 1)} />
      {#if page1Preview}
        <img src={page1Preview} alt="Page 1 preview" class="mt-4 max-h-48 w-full rounded object-contain" />
        <p class="mt-2 text-xs text-[var(--color-text-muted)]">{page1Name}</p>
      {/if}
    </label>

    <label
      class="block rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 transition hover:border-[var(--color-primary)]"
      on:dragover|preventDefault
      on:drop={(event) => dropFile(event, 2)}
    >
      <span class="mb-2 block font-semibold">Page 2: HS% / ADR / UD / EF</span>
      <span class="mb-3 block text-sm text-[var(--color-text-secondary)]">Drop, choose, or paste the second cropped scoreboard page.</span>
      <input bind:this={page2Input} type="file" name="page2" accept="image/*" class="block w-full text-sm text-[var(--color-text-secondary)]" on:change={(event) => fileFromEvent(event, 2)} on:focus={() => (pasteTarget = 2)} />
      {#if page2Preview}
        <img src={page2Preview} alt="Page 2 preview" class="mt-4 max-h-48 w-full rounded object-contain" />
        <p class="mt-2 text-xs text-[var(--color-text-muted)]">{page2Name}</p>
      {/if}
    </label>
  </div>

  <button
    type="submit"
    class="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-5 py-2 font-medium text-[#0e100f] hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-70"
    disabled={isParsing}
  >
    {#if isParsing}
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-[#0e100f]/30 border-t-[#0e100f]" aria-hidden="true"></span>
      Parsing
    {:else}
      Parse screenshots
    {/if}
  </button>

  {#if isParsing}
    <div class="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 text-sm text-[var(--color-text-secondary)]" role="status" aria-live="polite">
      <div class="flex items-center justify-between gap-4">
        <span>Ollama is reading the scoreboard pages.</span>
        <span class="tabular-nums">{elapsedSeconds}s</span>
      </div>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
        <div class="h-full w-1/3 animate-pulse rounded-full bg-[var(--color-primary)]"></div>
      </div>
    </div>
  {/if}
</form>
