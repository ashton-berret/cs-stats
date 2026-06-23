<script lang="ts">
  import { enhance } from "$app/forms";
  import { theme } from "$lib/stores";
  import { Card, Input, Select, Button } from "$lib/components/ui";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let testing = false;
  let saving = false;
  let steamTesting = false;

  // Local copy so the form reflects edits without a full reload after save.
  $: settings = data.settings;
  // Two-way bound so the Steam test form can read the currently typed id.
  let steamId = data.settings.steamId64;
  $: saveResult = form && "saved" in form ? form : null;
  $: testResult = form && "tested" in form ? form : null;
  $: steamResult = form && "steamTested" in form ? form : null;
</script>

<section class="space-y-6">
  <div>
    <h1 class="font-[var(--font-display)] text-3xl font-bold uppercase tracking-wide text-[var(--color-text-primary)]">Settings</h1>
    <p class="mt-2 text-[var(--color-text-secondary)]">Parsing, profile, and appearance.</p>
  </div>

  <form
    method="POST"
    action="?/save"
    use:enhance={() => {
      saving = true;
      return async ({ update }) => {
        await update({ reset: false });
        saving = false;
      };
    }}
  >
    <Card>
      <h2 class="text-lg font-semibold">Profile & parsing</h2>
      <p class="mt-1 mb-4 text-sm text-[var(--color-text-secondary)]">
        Your in-game name locates your row on the scoreboard. The parse engine is used when you upload screenshots.
      </p>

      <Input
        label="In-game name"
        name="inGameName"
        value={settings.inGameName}
        placeholder="e.g. neovimbtw"
      />

      <label class="mb-3 block">
        <span class="mb-1 block text-sm text-[var(--color-text-secondary)]">SteamID64 (for weapon stats)</span>
        <input
          name="steamId64"
          bind:value={steamId}
          placeholder="7656119..."
          inputmode="numeric"
          class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
        />
        <span class="mt-1 block text-xs text-[var(--color-text-secondary)]">17-digit ID from your profile URL. Your CS2 profile's game details must be public.</span>
      </label>

      <Select label="Parse engine" name="parseEngine" value={settings.parseEngine}>
        <option value="vision">Vision model (local, recommended)</option>
        <option value="ocr">OCR (offline fallback)</option>
        <option value="manual">Manual only</option>
      </Select>

      <div class="grid gap-x-4 sm:grid-cols-2">
        <Input label="Ollama URL" name="ollamaUrl" value={settings.ollamaUrl} placeholder="http://localhost:11434" />
        <Input label="Ollama model" name="ollamaModel" value={settings.ollamaModel} placeholder="qwen3-vl:8b" />
      </div>

      <Select label="OCR resolution profile" name="ocrResolution" value={settings.ocrResolution}>
        {#each data.ocrResolutions as resolution}
          <option value={resolution}>{resolution}</option>
        {/each}
      </Select>

      <div class="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
        {#if saveResult}
          <span class={`text-sm ${saveResult.saved ? "text-[#2ED573]" : "text-[#FF4757]"}`}>{saveResult.message}</span>
        {/if}
      </div>
    </Card>
  </form>

  <!-- Test connection: separate form so saving edits is not required to test -->
  <form
    method="POST"
    action="?/testConnection"
    use:enhance={() => {
      testing = true;
      return async ({ update }) => {
        await update({ reset: false });
        testing = false;
      };
    }}
  >
    <Card>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold">Ollama connection</h2>
          <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
            Check that the vision model server is reachable at the URL above.
          </p>
        </div>
        <!-- Tests the currently-saved URL field value -->
        <input type="hidden" name="ollamaUrl" value={settings.ollamaUrl} />
        <Button type="submit" disabled={testing}>{testing ? "Testing…" : "Test connection"}</Button>
      </div>

      {#if testResult}
        {#if testResult.ok}
          <div class="mt-4 rounded-md border border-[#2ED573]/40 bg-[#2ED573]/10 p-3 text-sm">
            <p class="font-medium text-[#2ED573]">✓ Connected</p>
            {#if testResult.models.length}
              <p class="mt-1 text-[var(--color-text-secondary)]">Models: {testResult.models.join(", ")}</p>
            {:else}
              <p class="mt-1 text-[var(--color-text-secondary)]">No models pulled yet — run <code>ollama pull {settings.ollamaModel}</code>.</p>
            {/if}
          </div>
        {:else}
          <div class="mt-4 rounded-md border border-[#FF4757]/40 bg-[#FF4757]/10 p-3 text-sm">
            <p class="font-medium text-[#FF4757]">✗ Not reachable</p>
            <p class="mt-1 text-[var(--color-text-secondary)]">{testResult.error ?? "Ollama is not responding."} Is Ollama running?</p>
          </div>
        {/if}
      {/if}
    </Card>
  </form>

  <!-- Steam profile test: reads the SteamID typed above -->
  <form
    method="POST"
    action="?/testSteam"
    use:enhance={() => {
      steamTesting = true;
      return async ({ update }) => {
        await update({ reset: false });
        steamTesting = false;
      };
    }}
  >
    <Card>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold">Steam profile</h2>
          <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
            Check that the SteamID above is valid and its CS2 game details are public.
          </p>
        </div>
        <input type="hidden" name="steamId64" value={steamId} />
        <Button type="submit" disabled={steamTesting}>{steamTesting ? "Checking…" : "Test Steam profile"}</Button>
      </div>

      {#if steamResult}
        <div class={`mt-4 rounded-md border p-3 text-sm ${steamResult.steamOk ? "border-[#2ED573]/40 bg-[#2ED573]/10" : "border-[#FF4757]/40 bg-[#FF4757]/10"}`}>
          <p class={`font-medium ${steamResult.steamOk ? "text-[#2ED573]" : "text-[#FF4757]"}`}>
            {steamResult.steamOk ? "✓ Public profile" : "✗ Not available"}
          </p>
          <p class="mt-1 text-[var(--color-text-secondary)]">{steamResult.steamMessage}</p>
        </div>
      {/if}
    </Card>
  </form>

  <!-- Game State Integration (auto-capture) -->
  <Card>
    <h2 class="text-lg font-semibold">Game integration (auto-capture)</h2>
    <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
      Let CS2 report matches automatically — no screenshots. This app must be running while you play.
      GSI captures core stats, side, and rounds; ADR/utility still need an optional screenshot.
    </p>

    <ol class="mt-4 space-y-3 text-sm">
      <li class="flex gap-3">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-[#0e100f]">1</span>
        <span>
          <a href="/api/gsi/config" class="font-medium text-[var(--color-primary)] hover:underline" download>Download your config file</a>
          (it contains your personal token).
        </span>
      </li>
      <li class="flex gap-3">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-[#0e100f]">2</span>
        <span>
          Drop <code class="rounded bg-[var(--color-bg-surface-overlay)] px-1">gamestate_integration_csstats.cfg</code> into your CS2 cfg folder:
          <code class="mt-1 block break-all rounded bg-[var(--color-bg-surface-overlay)] px-2 py-1 text-xs">…\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg\</code>
        </span>
      </li>
      <li class="flex gap-3">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-[#0e100f]">3</span>
        <span>Restart CS2. Matches will save automatically when they end, tagged <code class="rounded bg-[var(--color-bg-surface-overlay)] px-1">gsi</code>.</span>
      </li>
    </ol>

    <div class="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface-overlay)] p-3 text-xs text-[var(--color-text-secondary)]">
      <p>Endpoint: <code class="break-all">{data.gsi.endpoint}</code></p>
      <p class="mt-1">Token: <code class="break-all">{data.gsi.token}</code> <span class="text-[var(--color-text-muted)]">(keep private)</span></p>
    </div>
  </Card>

  <Card>
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold">Theme</h2>
        <p class="mt-1 text-sm text-[var(--color-text-secondary)]">Currently {$theme === "light" ? "light" : "dark"}. Stored locally on this device.</p>
      </div>
      <button
        type="button"
        class="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        on:click={() => theme.toggle()}
      >
        Switch to {$theme === "light" ? "dark" : "light"}
      </button>
    </div>
  </Card>
</section>
