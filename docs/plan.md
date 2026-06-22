# CS2 Casual Stats Tracker - Complete Implementation Plan

A personal Counter-Strike 2 **casual** stats tracker. CS2 only persists competitive/Premier stats, so this app captures casual-match performance manually: after a match, paste the two end-of-match scoreboard screenshots, let a locally-run vision model (or OCR) parse them, review/correct the numbers, save the match, and watch your K/D, ADR, win rate, and per-map performance trend over time.

**This plan reuses the proven foundation from the `zwift-completionist` project** (SvelteKit + Prisma + Lucia auth + TailwindCSS + ECharts + Winston). Shared, identical infrastructure is **referenced** to `../../zwift-completionist/docs/plan.md` with the exact change notes inline, so we don't re-paste hundreds of lines of identical auth/UI code. **All CS2-specific code (schema, parsing engine, upload/review flow, stats, charts) is specified inline in full.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack & Dependencies](#tech-stack--dependencies)
3. [Color Scheme](#color-scheme)
4. [Database Schema](#database-schema)
5. [Project Structure](#project-structure)
6. [Shared Foundation (ported from zwift)](#shared-foundation-ported-from-zwift)
7. [Scoreboard Parsing Engine](#scoreboard-parsing-engine)
8. [Screenshot Upload & Review Flow](#screenshot-upload--review-flow)
9. [Match List & Manual Entry](#match-list--manual-entry)
10. [Dashboard Stats & Charts](#dashboard-stats--charts)
11. [Settings](#settings)
12. [Implementation Phases](#implementation-phases)
13. [Future Goals](#future-goals)

---

## Project Overview

### Goal

Track CS2 casual match performance over time. The core loop:

1. **Play a casual match.**
2. **At the end screen, capture the two scoreboard stat pages** (CS2's post-match scoreboard toggles between a basic page and a detailed page).
3. **Paste/upload both screenshots** into the app.
4. **The app parses them** (local vision model by default, OCR fallback) into structured per-player rows + match context (map, score, result).
5. **Review and correct** the parsed values in an editable form (this is the same form used for fully manual entry).
6. **Save.** The match and your personal stat row are stored.
7. **View progress** on a dashboard: K/D and ADR trends, win rate, per-map performance, HS% trend, recent form.

### Core Principles

- **Local-first parsing** — a vision model you install (via Ollama) runs on your own machine. No cloud API, no API key, no per-parse cost, no screenshots leaving your computer. Deterministic Tesseract.js OCR is the offline fallback (viable because the scoreboard layout is static).
- **Never trust auto-parse blindly** — every parse lands in an editable review form before it is saved. The review form *is* the manual-entry form, so the app is fully usable even with no parser running.
- **Pluggable parser interface** — vision model, OCR, and (future) cloud/game-API engines all implement one `ScoreboardParser` interface and are selectable in settings.
- **Per-user from day one** — Lucia session auth, per-user data isolation. Single user today, public-ready later.
- **Self-row scope, lobby-ready schema** — v1 persists only *your* row, but a dedicated `PlayerMatchStat` table makes capturing all 10 players a future add with no migration pain.
- **SvelteKit + Prisma + SQLite + TailwindCSS + ECharts** full-stack app, dark-first with a CS2 gold/amber accent.

---

## Tech Stack & Dependencies

### Initialize Project

```bash
bunx sv create cs-stats
# Select: SvelteKit minimal, TypeScript, no additional options
cd cs-stats
```

### package.json

Identical base to the zwift project (SvelteKit 2 / Svelte 5 / Prisma 7 / Tailwind 4 / ECharts 6 / Lucia 3 / Winston), **plus** image-handling and parsing deps:

```json
{
  "name": "cs-stats",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch"
  },
  "devDependencies": {
    "@oslojs/crypto": "^1.0.1",
    "@oslojs/encoding": "^1.1.0",
    "@sveltejs/adapter-auto": "^7.0.0",
    "@sveltejs/kit": "^2.49.1",
    "@sveltejs/vite-plugin-svelte": "^6.2.1",
    "@tailwindcss/vite": "^4.1.18",
    "@types/node": "^25.0.8",
    "prisma": "^7.2.0",
    "svelte": "^5.45.6",
    "svelte-check": "^4.3.4",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.9.3",
    "vite": "^7.2.6"
  },
  "dependencies": {
    "@libsql/client": "^0.17.0",
    "@lucia-auth/adapter-prisma": "^4.0.1",
    "@node-rs/argon2": "^2.0.2",
    "@prisma/adapter-libsql": "^7.2.0",
    "@prisma/client": "^7.2.0",
    "dotenv": "^17.2.3",
    "echarts": "^6.0.0",
    "lucia": "^3.2.2",
    "sharp": "^0.34.0",
    "tesseract.js": "^6.0.0",
    "winston": "^3.19.0"
  }
}
```

New deps vs zwift: **`sharp`** (server-side image decode/crop/preprocess for the OCR engine and thumbnailing), **`tesseract.js`** (offline OCR fallback). The vision-model engine needs **no npm dependency** — it talks to a local Ollama server over plain `fetch` to `http://localhost:11434`. Dropped vs zwift: `pdf-parse`, `papaparse` (no PDF/CSV import here).

After creating `package.json`, run `bun install`.

### External runtime dependency: Ollama (for the default parser)

- Install Ollama for Windows from <https://ollama.com>.
- Pull a vision-capable model. Recommended default (best accuracy-per-VRAM, fits a 16 GB GPU fully on-device): `ollama pull qwen3-vl:8b`. Quality bump if 8b underperforms: `ollama pull qwen3-vl:30b` (MoE, ~18 GB quantized — slightly over 16 GB so a few layers spill to RAM, slower). Snappier/lighter: `ollama pull qwen3-vl:4b`.
- Ollama serves an HTTP API on `http://localhost:11434` automatically. The app calls `/api/chat` with `format: "json"`.
- **Ollama is optional** — if it isn't running, the user can switch the parse engine to OCR (Tesseract, bundled) or enter stats manually. The app degrades gracefully.

---

## Color Scheme

CS2-inspired: dark base, classic **CS gold/amber** primary, with **CT-blue** and **T-yellow** as team/chart accents and clear **win/loss** semantics.

### Dark Theme (Default)

```css
:root {
    --color-bg-base: #0E1116;
    --color-bg-surface: #161A21;
    --color-bg-surface-elevated: #1C212B;
    --color-bg-surface-overlay: #242A35;
    --color-primary: #F2A900;          /* CS gold/amber */
    --color-primary-hover: #D99500;
    --color-primary-glow: rgba(242, 169, 0, 0.35);
    --color-secondary: #4A9EFF;        /* CT blue */
    --color-success: #2ED573;          /* win */
    --color-warning: #FFB800;          /* tie */
    --color-danger: #FF4757;           /* loss */
    --color-text-primary: #F5F7FA;
    --color-text-secondary: #9AA4B2;
    --color-text-muted: #5E6776;
    --color-border: #2A313D;
    --color-border-hover: #3A424F;
    --color-team-ct: #6CA0DC;
    --color-team-t: #E0A93B;
}
```

### Light Theme Override

```css
.light {
    --color-bg-base: #F2F4F7;
    --color-bg-surface: #FFFFFF;
    --color-bg-surface-elevated: #FFFFFF;
    --color-bg-surface-overlay: #F7F9FB;
    --color-primary: #C77E00;
    --color-primary-hover: #A56700;
    --color-primary-glow: rgba(199, 126, 0, 0.25);
    --color-secondary: #2563EB;
    --color-success: #10B981;
    --color-warning: #F59E0B;
    --color-danger: #EF4444;
    --color-text-primary: #111827;
    --color-text-secondary: #6B7280;
    --color-text-muted: #9CA3AF;
    --color-border: #E5E7EB;
    --color-border-hover: #D1D5DB;
    --color-team-ct: #2563EB;
    --color-team-t: #B45309;
}
```

### Map Colors (for charts)

| Map | Hex |
|-----|-----|
| Mirage | `#E8A33D` |
| Inferno | `#FF6B35` |
| Dust II | `#E0C068` |
| Nuke | `#5BC0BE` |
| Overpass | `#7FB069` |
| Ancient | `#3D8C5C` |
| Anubis | `#C9A227` |
| Vertigo | `#8E9AAF` |
| Train | `#6C757D` |
| Office | `#9B5DE5` |
| Italy | `#F15BB5` |
| (other) | `#4A9EFF` |

The `localStorage` theme key is **`cs-theme`** (everywhere zwift used `zwift-theme`).

---

## Database Schema

### `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
}

// ============================================
// AUTHENTICATION  (identical to zwift)
// ============================================

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sessions Session[]
  matches  Match[]
  stats    PlayerMatchStat[]
  settings UserSettings?
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime

  user User @relation(references: [id], fields: [userId], onDelete: Cascade)

  @@index([userId])
}

// ============================================
// PER-USER SETTINGS
// ============================================

model UserSettings {
  id            String   @id @default(cuid())
  userId        String   @unique
  inGameName    String   @default("")     // used to locate the user's row on the scoreboard
  parseEngine   String   @default("vision") // "vision" | "ocr" | "manual"
  ollamaUrl     String   @default("http://localhost:11434")
  ollamaModel   String   @default("qwen3-vl:8b")
  ocrResolution String   @default("1920x1080") // calibration profile key for fixed-region OCR
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============================================
// MATCHES (one casual game)
// ============================================

model Match {
  id              String   @id @default(cuid())
  userId          String
  map             String                        // "Mirage", "Inferno", ...
  mode            String   @default("Casual")
  playedAt        DateTime                       // when the match was played
  teamScore       Int?                           // user's team rounds won
  enemyScore      Int?                           // enemy rounds won
  result          String                         // "WIN" | "LOSS" | "TIE"
  durationMinutes Int?
  notes           String?
  parseSource     String   @default("manual")    // "vision" | "ocr" | "manual"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  stats       PlayerMatchStat[]
  screenshots MatchScreenshot[]

  @@index([userId])
  @@index([userId, playedAt])
  @@index([map])
}

// ============================================
// PER-PLAYER STAT ROW
// v1: exactly one row per match (the user's, isUser=true).
// Future whole-lobby: up to 10 rows, no migration needed.
// ============================================

model PlayerMatchStat {
  id         String  @id @default(cuid())
  matchId    String
  userId     String?                  // set only when this row belongs to the app user
  playerName String
  team       String                   // "OWN" | "ENEMY"  (extensible to CT/T)
  isUser     Boolean @default(false)

  // Core combat
  kills    Int
  deaths   Int
  assists  Int
  adr      Float?

  // Extended combat (page 2 of the scoreboard; all optional)
  hsPercent      Float?
  mvps           Int?
  hltvRating     Float?
  enemiesFlashed Int?
  utilityDamage  Int?
  score          Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  match Match @relation(fields: [matchId], references: [id], onDelete: Cascade)
  user  User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([matchId])
  @@index([userId, isUser])
}

// ============================================
// UPLOADED SCREENSHOTS (audit + re-review)
// ============================================

model MatchScreenshot {
  id          String   @id @default(cuid())
  matchId     String
  page        Int                      // 1 = basic stat page, 2 = detailed stat page
  storagePath String                   // relative path under the data/uploads dir
  width       Int?
  height      Int?
  parsedRaw   String?                  // raw JSON the parse engine returned (audit trail)
  createdAt   DateTime @default(now())

  match Match @relation(fields: [matchId], references: [id], onDelete: Cascade)

  @@index([matchId])
}
```

### Schema Design Decisions

1. **`PlayerMatchStat` is separate from `Match`** even though v1 stores one row — this is the single most important forward-compatibility choice. Whole-lobby capture later inserts 10 rows instead of 1; nothing else changes.
2. **`team` is `OWN`/`ENEMY`**, not CT/T — casual players swap sides at halftime, so "your team vs the enemy" is the meaningful axis. CT/T can be added to the enum later if useful.
3. **`result` stored explicitly** (not derived) so a tie/draw and abandoned matches are representable, and dashboards don't recompute it on every query.
4. **Extended-combat fields are all nullable** — page 2 may be missing, or a given screenshot may not show every column. The app never blocks a save on a missing optional stat.
5. **`K/D ratio` and `HS%`-derived metrics are computed, not stored** — derive in the stats calculator to avoid drift. (`hsPercent` is stored because it comes straight off the scoreboard.)
6. **Screenshots are stored on disk** under a `data/uploads/<userId>/` dir (path saved in the row), not as DB blobs — keeps SQLite small and lets you re-open/re-parse the original. `parsedRaw` keeps the model's raw output for debugging bad parses.
7. **Parse settings live in `UserSettings`**, including `inGameName` (needed to pick the user's row out of the 10 parsed rows).

After creating the schema, run:

```bash
bunx prisma migrate dev --name initial_schema
```

---

## Project Structure

```
src/
├── app.css                      # CS2 gold/amber theme vars (see Color Scheme)
├── app.html                     # theme flash-prevention script, key: cs-theme
├── app.d.ts                     # Lucia types (identical to zwift)
├── hooks.server.ts              # session validation (identical to zwift)
│
├── lib/
│   ├── components/
│   │   ├── ui/                  # Button, Card, Input, Select, Modal, index.ts  (port from zwift)
│   │   ├── layout/
│   │   │   └── Navigation.svelte         # nav: Dashboard, Matches, Add Match, Settings
│   │   ├── charts/
│   │   │   ├── EChart.svelte             # base wrapper (port from zwift)
│   │   │   ├── KDTrend.svelte
│   │   │   ├── AdrTrend.svelte
│   │   │   ├── ResultsDonut.svelte
│   │   │   ├── PerformanceByMap.svelte
│   │   │   └── HsTrend.svelte
│   │   └── matches/
│   │       ├── ScoreboardUpload.svelte   # two-image drop/paste zone
│   │       ├── MatchReviewForm.svelte    # editable parsed/manual stat form (shared)
│   │       ├── MatchCard.svelte          # row in the matches list
│   │       └── MatchFilters.svelte       # map / result / date / sort
│   │
│   ├── config/
│   │   ├── theme.ts             # dark/light theme objects (CS2 palette)
│   │   ├── chartTheme.ts        # ECharts theme (port from zwift, swap palette)
│   │   └── maps.ts              # CS2 map list + colors
│   │
│   ├── server/
│   │   ├── auth/                # lucia.ts, password.ts  (identical to zwift)
│   │   ├── db/
│   │   │   ├── client.ts        # Prisma singleton (file:./prisma/cs-stats.db)
│   │   │   └── repositories/
│   │   │       ├── match-repository.ts
│   │   │       ├── settings-repository.ts
│   │   │       └── index.ts
│   │   ├── services/
│   │   │   ├── parsing/
│   │   │   │   ├── types.ts
│   │   │   │   ├── parser-interface.ts
│   │   │   │   ├── vision-model-parser.ts
│   │   │   │   ├── ocr-parser.ts
│   │   │   │   ├── ocr-regions.ts          # fixed bounding boxes per resolution
│   │   │   │   ├── merge.ts                # merge page1+page2, locate user row
│   │   │   │   └── index.ts                # engine factory
│   │   │   ├── storage/
│   │   │   │   └── screenshot-store.ts     # save/read uploaded images
│   │   │   └── analytics/
│   │   │       ├── stats-calculator.ts
│   │   │       └── index.ts
│   │   └── utils/
│   │       └── logger.ts        # Winston (identical to zwift)
│   │
│   ├── stores/
│   │   ├── theme.ts             # key: cs-theme  (port from zwift)
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── match.ts
│   │   ├── parsing.ts
│   │   ├── analytics.ts
│   │   └── index.ts
│   │
│   └── utils/
│       └── format.ts            # ratio, percent, date, duration formatters
│
├── routes/
│   ├── +layout.server.ts        # expose user (identical to zwift)
│   ├── +layout.svelte           # nav + main (swap title/theme key)
│   ├── +page.server.ts          # redirect to /dashboard or /login
│   ├── login/                   # (identical to zwift, retitled)
│   ├── register/                # (identical to zwift, retitled)
│   ├── logout/                  # (identical to zwift)
│   ├── dashboard/
│   │   ├── +page.server.ts
│   │   └── +page.svelte
│   ├── matches/
│   │   ├── +page.server.ts      # list + delete
│   │   ├── +page.svelte
│   │   ├── new/
│   │   │   ├── +page.server.ts  # upload+parse action, manual-create action
│   │   │   └── +page.svelte     # upload zone OR manual form -> review form
│   │   └── [id]/
│   │       ├── +page.server.ts  # view / update / delete
│   │       └── +page.svelte
│   └── settings/
│       ├── +page.server.ts      # load/save UserSettings, engine health check
│       └── +page.svelte
│
└── prisma/
    └── schema.prisma
```

---

## Shared Foundation (ported from zwift)

These files are **functionally identical** to `../../zwift-completionist/docs/plan.md`. Port them verbatim with the noted substitutions. (They are battle-tested there; re-implementing them would only introduce risk.)

| File(s) | Port from zwift section | Change |
|---------|-------------------------|--------|
| `src/app.html` | "Source Files - Foundation" | localStorage key `zwift-theme` → **`cs-theme`**; `<title>` → "CS2 Stats" |
| `src/app.d.ts` | same | none |
| `src/hooks.server.ts` | same | none |
| `src/lib/server/auth/lucia.ts` | same | none |
| `src/lib/server/auth/password.ts` | same | none |
| `src/lib/server/db/client.ts` | same | db filename `zwift.db` → **`cs-stats.db`** |
| `src/lib/server/utils/logger.ts` | same | none |
| `src/lib/stores/theme.ts`, `stores/index.ts` | "Source Files - Foundation" | `STORAGE_KEY` → **`cs-theme`** |
| `src/lib/config/theme.ts` | same | replace palette objects with the CS2 dark/light values from [Color Scheme](#color-scheme) |
| `src/lib/config/chartTheme.ts` | same | swap the `color: [...]` palette to CS2 accents: `['#F2A900','#4A9EFF','#2ED573','#FF6B35','#9B5DE5','#5BC0BE','#E0A93B','#F15BB5']` |
| `src/lib/components/ui/*` (Button, Card, Input, Select, Modal, index.ts) | "Source Files - UI Components" | none (theme is driven by CSS vars) |
| `src/lib/components/charts/EChart.svelte` | same | none |
| `src/routes/login`, `register`, `logout`, `+layout.server.ts`, `+page.server.ts` | "Source Files - Auth Pages" | retitle copy to "CS2 Stats"; redirect target `/dashboard` unchanged |
| `src/app.css` | "Source Files - Foundation" | replace the `:root` / `.light` blocks with the CS2 palette; keep the `.card-glow`, `.btn-glow`, `.toggle-switch` helpers |

`src/lib/config/maps.ts` is new:

```typescript
export interface MapInfo { name: string; color: string; }

export const CS2_MAPS: MapInfo[] = [
    { name: 'Mirage',   color: '#E8A33D' },
    { name: 'Inferno',  color: '#FF6B35' },
    { name: 'Dust II',  color: '#E0C068' },
    { name: 'Nuke',     color: '#5BC0BE' },
    { name: 'Overpass', color: '#7FB069' },
    { name: 'Ancient',  color: '#3D8C5C' },
    { name: 'Anubis',   color: '#C9A227' },
    { name: 'Vertigo',  color: '#8E9AAF' },
    { name: 'Train',    color: '#6C757D' },
    { name: 'Office',   color: '#9B5DE5' },
    { name: 'Italy',    color: '#F15BB5' },
];

export const MAP_NAMES = CS2_MAPS.map((m) => m.name);
const MAP_COLOR = new Map(CS2_MAPS.map((m) => [m.name, m.color]));
export const mapColor = (name: string): string => MAP_COLOR.get(name) ?? '#4A9EFF';
```

Navigation items (`src/lib/components/layout/Navigation.svelte`, same structure as zwift's sidebar, active state uses the gold glow `bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary-glow)]`):

- **Dashboard** (home icon)
- **Matches** (list icon)
- **Add Match** (plus / upload icon)
- **Settings** (cog icon)

---

## Scoreboard Parsing Engine

The heart of the app. All engines implement one interface and return the same shape; the upload flow feeds that shape into the review form. Engines never write to the DB — they only parse.

### `src/lib/types/parsing.ts`

```typescript
export type ParseEngine = 'vision' | 'ocr' | 'manual';
export type Team = 'OWN' | 'ENEMY';

export interface ParsedPlayerRow {
    playerName: string;
    team: Team | null;       // best-effort; user confirms in review
    kills: number | null;
    deaths: number | null;
    assists: number | null;
    adr: number | null;
    hsPercent: number | null;
    mvps: number | null;
    hltvRating: number | null;
    enemiesFlashed: number | null;
    utilityDamage: number | null;
    score: number | null;
}

export interface ParsedMatchContext {
    map: string | null;
    teamScore: number | null;
    enemyScore: number | null;
    durationMinutes: number | null;
}

export interface ScoreboardParseResult {
    engine: ParseEngine;
    context: ParsedMatchContext;
    rows: ParsedPlayerRow[];   // all rows the engine could read (up to 10)
    userRowIndex: number | null; // index into rows that matches the user's inGameName
    rawByPage: Record<number, string>; // raw engine output per page, for audit
    warnings: string[];
}
```

### `src/lib/server/services/parsing/parser-interface.ts`

```typescript
import type { ScoreboardParseResult } from '$lib/types/parsing';

export interface ScoreboardImage {
    page: number;        // 1 = basic page, 2 = detailed page
    buffer: Buffer;      // raw image bytes
    mime: string;
}

export interface ParserContext {
    inGameName: string;
    ocrResolution: string;
    ollamaUrl: string;
    ollamaModel: string;
}

export interface ScoreboardParser {
    readonly engine: 'vision' | 'ocr';
    parse(images: ScoreboardImage[], ctx: ParserContext): Promise<ScoreboardParseResult>;
}
```

### Vision-model engine (default) — `vision-model-parser.ts`

Calls a locally installed Ollama model over HTTP with the images base64-encoded and a strict JSON instruction. Uses `format: "json"` so Ollama constrains the model to emit valid JSON. One call per page; results merged downstream.

```typescript
import type { ScoreboardParser, ScoreboardImage, ParserContext } from './parser-interface';
import type { ParsedPlayerRow, ScoreboardParseResult } from '$lib/types/parsing';
import { logger, logError } from '$lib/server/utils/logger';

const PAGE1_PROMPT = `You are reading a Counter-Strike 2 end-of-match scoreboard screenshot (the BASIC stat page).
Return ONLY JSON with this exact shape:
{
  "map": string|null,
  "teamScore": number|null,
  "enemyScore": number|null,
  "rows": [
    { "playerName": string, "team": "top"|"bottom"|null,
      "kills": number|null, "deaths": number|null, "assists": number|null,
      "adr": number|null, "score": number|null }
  ]
}
List every visible player row, top team first. Numbers must be integers except adr (one decimal allowed). Do not invent values; use null if unreadable.`;

const PAGE2_PROMPT = `You are reading a Counter-Strike 2 end-of-match scoreboard screenshot (the DETAILED stat page).
Return ONLY JSON with this exact shape:
{
  "rows": [
    { "playerName": string,
      "hsPercent": number|null, "mvps": number|null, "hltvRating": number|null,
      "enemiesFlashed": number|null, "utilityDamage": number|null }
  ]
}
List every visible player row in the same top-to-bottom order as the scoreboard. Use null if a value is unreadable.`;

async function callOllama(ctx: ParserContext, prompt: string, image: ScoreboardImage): Promise<string> {
    const res = await fetch(`${ctx.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: ctx.ollamaModel,
            stream: false,
            format: 'json',
            options: { temperature: 0 },
            messages: [
                { role: 'user', content: prompt, images: [image.buffer.toString('base64')] }
            ]
        })
    });
    if (!res.ok) throw new Error(`Ollama responded ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.message?.content ?? '';
}

export class VisionModelParser implements ScoreboardParser {
    readonly engine = 'vision' as const;

    async parse(images: ScoreboardImage[], ctx: ParserContext): Promise<ScoreboardParseResult> {
        const warnings: string[] = [];
        const rawByPage: Record<number, string> = {};
        const page1 = images.find((i) => i.page === 1);
        const page2 = images.find((i) => i.page === 2);

        let context = { map: null, teamScore: null, enemyScore: null, durationMinutes: null } as ScoreboardParseResult['context'];
        const partialRows: Partial<ParsedPlayerRow>[] = [];

        if (page1) {
            try {
                const raw = await callOllama(ctx, PAGE1_PROMPT, page1);
                rawByPage[1] = raw;
                const p = JSON.parse(raw);
                context = { map: p.map ?? null, teamScore: p.teamScore ?? null, enemyScore: p.enemyScore ?? null, durationMinutes: null };
                for (const r of p.rows ?? []) {
                    partialRows.push({
                        playerName: String(r.playerName ?? '').trim(),
                        team: null,
                        kills: numOrNull(r.kills), deaths: numOrNull(r.deaths), assists: numOrNull(r.assists),
                        adr: numOrNull(r.adr), score: numOrNull(r.score)
                    });
                }
            } catch (e) {
                logError('Vision parse page 1 failed', e);
                warnings.push('Could not parse the basic stat page.');
            }
        }

        if (page2) {
            try {
                const raw = await callOllama(ctx, PAGE2_PROMPT, page2);
                rawByPage[2] = raw;
                const p = JSON.parse(raw);
                // merge by index/order into partialRows in merge.ts; here just stash page-2 fields by name
                (p.rows ?? []).forEach((r: any, i: number) => {
                    const target = partialRows[i] ?? (partialRows[i] = { playerName: String(r.playerName ?? '').trim() });
                    target.hsPercent = numOrNull(r.hsPercent);
                    target.mvps = numOrNull(r.mvps);
                    target.hltvRating = numOrNull(r.hltvRating);
                    target.enemiesFlashed = numOrNull(r.enemiesFlashed);
                    target.utilityDamage = numOrNull(r.utilityDamage);
                });
            } catch (e) {
                logError('Vision parse page 2 failed', e);
                warnings.push('Could not parse the detailed stat page.');
            }
        }

        const rows = partialRows.map(normalizeRow);
        const userRowIndex = locateUserRow(rows, ctx.inGameName);
        logger.info('Vision parse complete', { rows: rows.length, userRowIndex });

        return { engine: 'vision', context, rows, userRowIndex, rawByPage, warnings };
    }
}

function numOrNull(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function normalizeRow(p: Partial<ParsedPlayerRow>): ParsedPlayerRow {
    return {
        playerName: p.playerName ?? '', team: p.team ?? null,
        kills: p.kills ?? null, deaths: p.deaths ?? null, assists: p.assists ?? null,
        adr: p.adr ?? null, hsPercent: p.hsPercent ?? null, mvps: p.mvps ?? null,
        hltvRating: p.hltvRating ?? null, enemiesFlashed: p.enemiesFlashed ?? null,
        utilityDamage: p.utilityDamage ?? null, score: p.score ?? null
    };
}

export function locateUserRow(rows: ParsedPlayerRow[], inGameName: string): number | null {
    if (!inGameName) return null;
    const target = inGameName.trim().toLowerCase();
    let best = -1, bestScore = 0;
    rows.forEach((r, i) => {
        const name = r.playerName.trim().toLowerCase();
        if (!name) return;
        const s = name === target ? 1 : name.includes(target) || target.includes(name) ? 0.6 : 0;
        if (s > bestScore) { bestScore = s; best = i; }
    });
    return bestScore >= 0.6 ? best : null;
}
```

> **Note on page merging:** page 1 and page 2 list the same players in the same vertical order, so the simplest robust merge is **by row index** (done above). `merge.ts` adds a name-based reconciliation pass as a safety net when counts differ.

### OCR engine (offline fallback) — `ocr-parser.ts`

Because the scoreboard layout is **static for a given resolution**, the OCR engine doesn't try to read the whole image. It crops **known cell rectangles** (defined in `ocr-regions.ts`) with `sharp`, light-preprocesses each crop (grayscale, upscale, threshold), and runs Tesseract on individual cells — numbers OCR far more reliably in isolation than a full noisy scoreboard does.

```typescript
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import type { ScoreboardParser, ScoreboardImage, ParserContext } from './parser-interface';
import type { ParsedPlayerRow, ScoreboardParseResult } from '$lib/types/parsing';
import { getRegions } from './ocr-regions';
import { locateUserRow } from './vision-model-parser';
import { logError } from '$lib/server/utils/logger';

async function ocrCell(img: Buffer, box: { x: number; y: number; w: number; h: number }, worker: any, numeric: boolean) {
    const crop = await sharp(img)
        .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
        .grayscale().normalize().resize({ width: box.w * 3 }).toBuffer();
    if (numeric) await worker.setParameters({ tessedit_char_whitelist: '0123456789.%' });
    else await worker.setParameters({ tessedit_char_whitelist: '' });
    const { data } = await worker.recognize(crop);
    return data.text.trim();
}

export class OcrParser implements ScoreboardParser {
    readonly engine = 'ocr' as const;

    async parse(images: ScoreboardImage[], ctx: ParserContext): Promise<ScoreboardParseResult> {
        const warnings: string[] = [];
        const rawByPage: Record<number, string> = {};
        const regions = getRegions(ctx.ocrResolution); // bounding boxes for this resolution profile
        if (!regions) {
            return { engine: 'ocr', context: emptyContext(), rows: [], userRowIndex: null, rawByPage,
                     warnings: [`No OCR calibration profile for ${ctx.ocrResolution}. Switch engine or enter manually.`] };
        }

        const worker = await createWorker('eng');
        const rows: ParsedPlayerRow[] = [];
        try {
            for (const image of images) {
                const cells = regions.cells[image.page] ?? [];
                for (const cell of cells) {
                    const text = await ocrCell(image.buffer, cell.box, worker, cell.numeric).catch((e) => {
                        logError('OCR cell failed', e, { page: image.page, field: cell.field }); return '';
                    });
                    applyCell(rows, cell.rowIndex, cell.field, text);
                }
                rawByPage[image.page] = JSON.stringify(rows);
            }
        } finally {
            await worker.terminate();
        }

        const context = readContext(rows); // map/score come from header region cells (omitted for brevity)
        const userRowIndex = locateUserRow(rows, ctx.inGameName);
        if (!rows.length) warnings.push('OCR read no rows — check the resolution profile.');
        return { engine: 'ocr', context, rows, userRowIndex, rawByPage, warnings };
    }
}

// applyCell / readContext / emptyContext: map a (rowIndex, field, text) into the rows array,
// coercing numbers and stripping the trailing % on hsPercent. (Implementation in the file.)
```

`ocr-regions.ts` holds a `Record<resolutionKey, { cells: Record<page, CellSpec[]> }>` calibration map. Ship a `1920x1080` profile to start; other resolutions can be added without code changes. **If no profile matches, the engine returns a clear warning and the user falls back to the vision model or manual entry** — never a silent wrong parse.

### Engine factory & merge — `index.ts`, `merge.ts`

```typescript
// index.ts
import { VisionModelParser } from './vision-model-parser';
import { OcrParser } from './ocr-parser';
import type { ScoreboardParser } from './parser-interface';

export function getParser(engine: string): ScoreboardParser {
    return engine === 'ocr' ? new OcrParser() : new VisionModelParser();
}

export async function checkVisionHealth(url: string): Promise<{ ok: boolean; models: string[]; error?: string }> {
    try {
        const res = await fetch(`${url}/api/tags`);
        if (!res.ok) return { ok: false, models: [], error: `Ollama ${res.status}` };
        const data = await res.json();
        return { ok: true, models: (data.models ?? []).map((m: any) => m.name) };
    } catch (e) {
        return { ok: false, models: [], error: 'Ollama not reachable on ' + url };
    }
}
```

`merge.ts` exposes `reconcile(rows)` (name-based safety net when page counts differ) and re-exports `locateUserRow`. The `settings` page calls `checkVisionHealth` to show a green/red status for the local model.

---

## Screenshot Upload & Review Flow

`/matches/new` is the main entry point. Two paths converge on the **same review form**:

- **Parse path:** drop/paste two screenshots → `?/parse` action runs the selected engine → returns a `ScoreboardParseResult` → the page renders `MatchReviewForm` prefilled with the user's located row + context.
- **Manual path:** click "Enter manually" → `MatchReviewForm` renders empty.

`MatchReviewForm` (`src/lib/components/matches/MatchReviewForm.svelte`) is the single source of truth for editing a match. Fields: map (`Select` of `MAP_NAMES`), playedAt (defaults to now), teamScore/enemyScore, result (auto-suggested from scores, user-overridable), duration, then the player stat block (kills/deaths/assists/adr + collapsible Extended: hsPercent/mvps/hltvRating/enemiesFlashed/utilityDamage/score), and notes. It submits to `?/save`.

### `ScoreboardUpload.svelte`

A two-slot drop zone (Page 1 / Page 2) supporting drag-drop **and clipboard paste** (`onpaste` reading `ClipboardEvent.clipboardData.items` for images — matches your "paste two screenshots" workflow). Shows a thumbnail per slot and a "Parse" button (disabled until at least page 1 is present; page 2 optional).

### `/matches/new/+page.server.ts` (sketch)

```typescript
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getParser } from '$lib/server/services/parsing';
import { getSettings } from '$lib/server/db/repositories/settings-repository';
import { createMatch } from '$lib/server/db/repositories/match-repository';
import { saveScreenshot } from '$lib/server/services/storage/screenshot-store';
import { requireUser } from '$lib/server/auth/guard'; // small helper: redirect to /login if no locals.user

export const load: PageServerLoad = async ({ locals }) => {
    const user = requireUser(locals);
    const settings = await getSettings(user.id);
    return { settings };
};

export const actions: Actions = {
    parse: async ({ request, locals }) => {
        const user = requireUser(locals);
        const settings = await getSettings(user.id);
        const fd = await request.formData();
        const images = [];
        for (const page of [1, 2]) {
            const f = fd.get(`page${page}`);
            if (f instanceof File && f.size > 0) {
                images.push({ page, buffer: Buffer.from(await f.arrayBuffer()), mime: f.type });
            }
        }
        if (!images.length) return fail(400, { message: 'Upload at least the first scoreboard page.' });

        const parser = getParser(settings.parseEngine);
        const result = await parser.parse(images, {
            inGameName: settings.inGameName, ocrResolution: settings.ocrResolution,
            ollamaUrl: settings.ollamaUrl, ollamaModel: settings.ollamaModel
        });
        // Return the parse result + the uploaded images (as data URLs) so the review form can prefill
        // and the screenshots can be persisted on save.
        return { parsed: result };
    },

    save: async ({ request, locals }) => {
        const user = requireUser(locals);
        const fd = await request.formData();
        // Validate + coerce the reviewed fields, then:
        const match = await createMatch(user.id, /* context + the single user stat row + parseSource */);
        // persist screenshots to disk + MatchScreenshot rows (with parsedRaw)
        // redirect to /matches/[id]
    }
};
```

**Validation rules on save:** map required; kills/deaths/assists required non-negative integers; result in {WIN,LOSS,TIE}; everything else optional. The save never depends on the parser having succeeded.

---

## Match List & Manual Entry

### `/matches`

Client-filtered list (matches load fine all at once for a personal history). `MatchFilters` provides search, map filter, result filter (All/Win/Loss/Tie), date range, and sort (newest, K/D, ADR). Each `MatchCard` shows: map badge (map color left border), date, score `16–12`, result chip (success/danger/warning), and your K/D/A + ADR. Click → `/matches/[id]`.

### `/matches/[id]`

Detail view: full stat block, the stored screenshots (click to enlarge), edit (reuses `MatchReviewForm`), and delete (confirm `Modal`).

### Manual entry

Always available via `/matches/new` → "Enter manually". This guarantees the app is useful with **no Ollama and no OCR** — important for the MVP and for matches where you forgot to screenshot.

---

## Dashboard Stats & Charts

### `DashboardStats` interface (`src/lib/types/analytics.ts`)

```typescript
export interface DashboardStats {
    totalMatches: number;
    wins: number; losses: number; ties: number;
    winRate: number;                 // wins / (wins+losses), %, ties excluded
    totalKills: number; totalDeaths: number; totalAssists: number;
    kdRatio: number;                 // totalKills / max(totalDeaths,1)
    avgAdr: number | null;
    avgHsPercent: number | null;
    avgHltvRating: number | null;
    bestMatch: { id: string; map: string; kills: number; deaths: number; playedAt: string } | null;
    kdTrend: { date: string; kd: number; kills: number; deaths: number }[];
    adrTrend: { date: string; adr: number }[];
    hsTrend: { date: string; hsPercent: number }[];
    resultBreakdown: { result: 'WIN' | 'LOSS' | 'TIE'; count: number }[];
    performanceByMap: { map: string; matches: number; kd: number; avgAdr: number | null; winRate: number; color: string }[];
    recentForm: ('WIN' | 'LOSS' | 'TIE')[]; // last ~10
}
```

`stats-calculator.ts` computes these from the user's matches + their `isUser` stat rows. K/D and rates are derived here (not stored).

### Metric cards (top row)

| Card | Value | Subtitle |
|------|-------|----------|
| Matches | `142` | `last played 2 days ago` |
| K/D Ratio | `1.18` | `3,012 K / 2,553 D` |
| Avg ADR | `84.6` | `avg HS 48%` |
| Win Rate | `54.2%` | `77 W · 61 L · 4 T` |

### Charts (ECharts, via the ported `EChart.svelte`)

- **KDTrend** — line of K/D per match over time (with a rolling-average line).
- **AdrTrend** — line of ADR over time.
- **ResultsDonut** — Win/Loss/Tie split (success/danger/warning colors).
- **PerformanceByMap** — bar chart, avg K/D (or ADR) per map, bars tinted by `mapColor`.
- **HsTrend** — line of HS% over time.
- **Recent form** — a small W/L/T pill strip for the last 10 matches.

Empty state: if no matches yet, the dashboard shows a "Add your first match" card linking to `/matches/new`.

---

## Settings

`/settings` (`UserSettings`-backed):

- **In-game name** — used to auto-locate your row on the scoreboard. (Free text; the review form lets you re-pick the row if the guess is wrong.)
- **Parse engine** — `Vision model (local)` / `OCR (offline)` / `Manual only`.
- **Ollama URL + model** — defaults `http://localhost:11434` / `qwen3-vl:8b`, with a **"Test connection"** button calling `checkVisionHealth` (green check + detected model list, or a red error with the install hint).
- **OCR resolution profile** — dropdown of shipped calibration profiles (start: `1920x1080`).
- **Theme** — dark/light toggle (client `cs-theme` store).

---

## Implementation Phases

### Phase 1: Project Setup & Auth (port from zwift)

1. `bunx sv create cs-stats`, install deps (add `sharp`, `tesseract.js`; drop `pdf-parse`, `papaparse`).
2. Create config files (vite, svelte, tsconfig, `.env` with `DATABASE_URL="file:./prisma/cs-stats.db"`, `.gitignore`).
3. Port the [Shared Foundation](#shared-foundation-ported-from-zwift) verbatim with the noted substitutions (theme key `cs-theme`, CS2 palette, db filename, retitles).
4. Set up Prisma with the full [schema](#database-schema); run the initial migration.
5. Build `Navigation.svelte` (Dashboard, Matches, Add Match, Settings) and the root layout/redirect.
6. Add a `requireUser` auth guard helper.
7. Placeholder pages for `/dashboard`, `/matches`, `/matches/new`, `/settings`.
8. **Verify:** `bun run check` passes; register/login works; nav renders.

### Phase 2: Match Schema, Manual Entry & Match List

1. Types: `match.ts`, `analytics.ts`, `parsing.ts`, `index.ts`.
2. `match-repository.ts` (create/update/delete/list with the `isUser` stat row) and `settings-repository.ts` (get-or-create defaults).
3. Build `MatchReviewForm.svelte` (the shared editor) and wire `/matches/new` **manual path** + `?/save`.
4. Build `/matches` list (`MatchCard`, `MatchFilters`) and `/matches/[id]` view/edit/delete.
5. **Verify:** create, edit, and delete a match entirely by hand; it appears in the list. *App is now fully usable with zero parsing.*

### Phase 3: Vision-Model Parsing (default engine)

1. `parser-interface.ts`, `parsing/types`, `vision-model-parser.ts`, `merge.ts`, engine factory `index.ts`, `checkVisionHealth`.
2. `screenshot-store.ts` (save uploads under `data/uploads/<userId>/`, return paths) + persist `MatchScreenshot` rows with `parsedRaw`.
3. `ScoreboardUpload.svelte` (drag-drop **+ clipboard paste**, two slots) and the `?/parse` action.
4. Wire the parse path into `MatchReviewForm` (prefill from `userRowIndex`; show `warnings`; allow re-picking the user row).
5. **Verify:** with Ollama running + a vision model pulled, paste two real CS2 scoreboards → fields prefill → correct & save.

### Phase 4: OCR Fallback Engine

1. `ocr-regions.ts` with a `1920x1080` calibration profile; `ocr-parser.ts` (sharp crop → Tesseract per cell).
2. Engine selection honored end-to-end via `UserSettings.parseEngine`.
3. **Verify:** switch engine to OCR, parse a 1080p scoreboard, confirm numeric cells read correctly; confirm a clear warning when no profile matches.

### Phase 5: Dashboard & Charts

1. `stats-calculator.ts` (all `DashboardStats` computations).
2. `/dashboard` page: 4 metric cards + chart grid.
3. Chart components: `KDTrend`, `AdrTrend`, `ResultsDonut`, `PerformanceByMap`, `HsTrend`, recent-form strip.
4. **Verify:** dashboard reflects real saved matches; all charts render in dark + light.

### Phase 6: Settings & Polish

1. `/settings` page (in-game name, parse engine, Ollama URL/model + Test connection, OCR profile, theme).
2. `format.ts` (ratio, percent, relative date, duration) used across views.
3. Empty states (no matches, no screenshots), loading states on parse (parsing can take a few seconds on CPU), responsive layout.
4. **Verify:** full loop end-to-end; `bun run check` clean.

---

## Future Goals

Captured now so the schema/architecture don't fight them later:

- **Weapon-specific stats** — per-weapon K/D, accuracy, HS%. Add a `WeaponStat` table linked to `PlayerMatchStat`; likely needs a third screenshot (the per-weapon breakdown) and an engine prompt for it.
- **Whole-lobby capture** — persist all 10 `PlayerMatchStat` rows (already modeled); unlock "you vs lobby average" comparisons.
- **Automatic / API-based ingestion** — pull match data from a game/stat API (or a cloud vision API as an alternate `ScoreboardParser`) so screenshots aren't needed. The pluggable parser interface already accommodates this.
- **Public multi-user SaaS** — auth is already per-user; add account management, hosting (swap SQLite for libSQL/Turso or Postgres), and a privacy story for uploaded screenshots.
- **Mobile capture** — snap the scoreboard on a phone and upload; the upload flow is already image-based.
```
