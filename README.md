# CS2 Casual Stats Tracker

A personal web app for tracking **Counter-Strike 2 casual-match** performance over time. CS2 only persists
competitive/Premier stats, so this app captures casual data manually: after a match you paste the two end-of-match
scoreboard screenshots, a locally-run vision model (or OCR) parses them, you review/correct the numbers, and your
K/D, ADR, win rate, and per-map performance trend over time on a dashboard.

> **Status:** scaffold up and running; feature implementation in progress (see `docs/progress.md`).

## How it works

1. Play a casual match.
2. Capture the two scoreboard stat pages at the end screen.
3. Paste/upload both screenshots into the app.
4. It parses them into structured stats + match context (map, score, result).
5. You review and correct the values in an editable form (also usable as pure manual entry).
6. Save. Your match and personal stat row are stored.
7. View progress on the dashboard.

Parsing is **local-first**: the default engine calls a vision model you run via [Ollama](https://ollama.com) on your
own machine (no cloud, no API key, no per-parse cost). A deterministic Tesseract.js OCR engine is the offline fallback,
and fully manual entry always works. Auto-parsed values are always reviewed before saving.

## Tech stack

SvelteKit 2 · Svelte 5 · TypeScript · Prisma 7 + SQLite · TailwindCSS 4 · ECharts 6 · Lucia 3 (session auth) ·
Winston · sharp + tesseract.js (OCR) · Ollama (local vision model). Package manager: **bun**.

## Prerequisites

- [bun](https://bun.com) (1.3+), Node 22+
- [Ollama](https://ollama.com) with a vision model, for the default parser:
  ```bash
  ollama pull qwen3-vl:8b
  ```
  Optional: `qwen3-vl:30b` (more accurate, heavier) or `qwen3-vl:4b` (lighter). Ollama serves on
  `http://localhost:11434`. Ollama is optional — you can switch to OCR or manual entry in Settings.

## Setup

```bash
bun install
bunx prisma generate          # bun blocks the postinstall script; run it once manually
bunx prisma migrate dev       # apply migrations / create prisma/cs-stats.db
bun run dev                   # http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run check` | Type-check (`svelte-check`) — must be 0 errors / 0 warnings |

## Project layout

```
docs/plan.md         Full self-contained implementation plan (schema, parsing engine, flows, charts)
docs/progress.md     Phase checklist + technical-decisions table
CODEX_HANDOFF.md     Implementation brief for the Codex coding agent
prisma/schema.prisma Database schema
src/                 SvelteKit app (see docs/plan.md for the structure)
```

## Development workflow

Architecture/product decisions and planning are done up front (`docs/plan.md`, `docs/progress.md`); feature code is
implemented against that spec by the Codex agent following `CODEX_HANDOFF.md`. Run `bun run check` after each phase and
keep it clean.

## Roadmap (post-v1)

Weapon-specific stats · whole-lobby capture (all 10 players) · API/automatic ingestion · public multi-user · mobile capture.
See the "Future Goals" section of `docs/plan.md`.
