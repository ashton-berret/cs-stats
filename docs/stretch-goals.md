# CS2 Stats Tracker — Stretch Goals

Post-MVP features. Each is self-contained and layers onto the existing match/stat schema. The MVP
(screenshot + vision-model parsing → review → save) stays the baseline; these add automated/richer
data sources behind the same pluggable philosophy.

> **Status:** Stretch Goal 1 (Steam Web API weapon stats) is **verified against a live CS2 account** and
> ready to implement. Stretch Goal 2 (GSI auto-capture) is researched and parked behind it.

---

## Stretch Goal 1 — Weapon Stats via Steam Web API  ✅ verified, ready to build

### What it is

CS2 exposes lifetime per-weapon kills/shots/hits (and overall kills/deaths/headshots/matches) through
the Steam Web API. This is **how csst.at does it** — the data is fetched **server-side** and rendered into
HTML, which is why a browser's network tab shows no stats request (only Google Fonts): the secret API key
never touches the client.

### Verified endpoint (tested 2026-06-22 against SteamID64 `76561198240393170`)

```
GET https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/
      ?appid=730&key=<STEAM_API_KEY>&steamid=<STEAMID64>
```

- Returned **132 stats**, `gameName: "Counter-Strike 2"` — confirms weapon stats still populate in CS2.
- Response shape: `{ playerstats: { steamID, gameName, stats: [{ name, value }, ...] } }` — a **flat name/value array**.
- **Per-weapon triplet:** `total_kills_<w>`, `total_shots_<w>`, `total_hits_<w>`. Accuracy = `hits / shots * 100`.
- **Overall fields present:** `total_kills`, `total_deaths`, `total_shots_fired`, `total_kills_headshot`,
  `total_mvps`, `total_wins`, `total_matches_won`, `total_matches_played`, `total_rounds_played`,
  `total_time_played` (seconds). NOTE: overall `total_shots_hit` was **absent** for this account — derive
  overall accuracy by summing per-weapon `total_hits_*` if needed, and treat the field as optional.

Sample (real values): `ak47` 3048 kills / 52613 shots / 21.5% · `m4a1` 2690 / 24.1% · `awp` 833 / 39.2% ·
`mp9` 351 / 32.4% · overall HS% = `total_kills_headshot / total_kills` ≈ 34%.

### Gotchas (from the live data)

1. **Lifetime cumulative, not per-match.** Cannot give "weapons used in *this* casual game" on its own.
   For per-session weapon stats, **snapshot the totals and diff** (see schema below).
2. **Filter pseudo-keys.** `total_kills_*` also matches non-weapons: `total_kills_headshot`,
   `total_kills_enemy_blinded`, `total_kills_enemy_weapon`, `total_kills_knife_fight`,
   `total_kills_against_zoomed_sniper`, etc. Use an explicit **weapon whitelist**, don't regex-glob blindly.
3. **Kills-only weapons.** `knife`, `hegrenade`, `molotov` report kills but no shots/hits → accuracy = n/a.
4. **Combined keys.** `total_kills_m4a1` covers **both** M4A4 and M4A1-S; `hkp2000` covers P2000 **and** USP-S;
   `glock` = Glock-18; `deagle` = Desert Eagle; `fiveseven` = Five-SeveN; `galilar` = Galil AR;
   `elite` = Dual Berettas. Display names must reflect this (e.g. label `m4a1` as "M4A4 / M4A1-S").
5. **Privacy:** the target profile's *Game Details* must be **Public** or the API returns an empty/forbidden
   response. Handle gracefully with a clear "set your CS2 profile to public" message.
6. **Rate limits:** ~100k calls/day/key. **Cache**; don't refetch on every page load (snapshot model handles this).

### Design

**Secret + identity**
- `STEAM_API_KEY` lives in `.env` (already gitignored), read **server-side only**. Never sent to the client,
  never committed. (Key was placed directly in `.env`, never pasted into chat — no rotation needed.)
- Add `steamId64 String?` to `UserSettings` (the whose-stats identity). Settings page gets a "Steam ID64" field
  with a short helper on where to find it + a "profile must be public" note.

**Schema — new model (snapshot for diffing)**
```prisma
model WeaponStatSnapshot {
  id          String   @id @default(cuid())
  userId      String
  capturedAt  DateTime @default(now())
  // Normalized rows stored as JSON so adding weapons needs no migration:
  // { overall: {...}, weapons: [{ key, kills, shots, hits }] }
  payload     String   // JSON
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, capturedAt])
}
```
- Latest snapshot = current lifetime weapon profile (what `/weapons` shows).
- Diff between two snapshots = weapons used in that window (future "session report").

**Service — `src/lib/server/services/steam/steam-api.ts`**
- `fetchUserGameStats(steamId: string): Promise<SteamGameStats>` — calls the endpoint, throws typed errors
  for private/not-found/no-CS2-data.
- `normalizeWeaponStats(raw): NormalizedWeaponStats` — applies the weapon whitelist + display-name map,
  computes accuracy, returns `{ overall, weapons[] }` sorted by kills desc.
- `WEAPON_CATALOG` — whitelist of real weapon keys → `{ display, category }` (rifle/pistol/smg/sniper/heavy/equipment).
- Keep the key in the service via `$env/static/private` (or `process.env`); never expose it in load data.

**Page — `/weapons`** (new nav item "Weapons")
- Load: get user's `steamId64` from settings; if missing → prompt to set it. Else fetch latest snapshot
  (refresh if older than e.g. 6h, or via an explicit "Refresh from Steam" button → `?/refresh` action that
  fetches + stores a new snapshot).
- UI: overall cards (total kills, K/D, HS%, accuracy, matches, hours) + a **sortable weapon table**
  (weapon, kills, shots, hits, accuracy%) + a bar chart of **top weapons by kills** and a chart of
  **accuracy by weapon** (reuse `EChart`, tint by category).
- Empty/error states: no steamId, private profile, Steam API unreachable.

**Settings additions**
- Steam ID64 input (persisted to `UserSettings.steamId64`).
- Optional "Test Steam profile" button → calls a health action that fetches stats and reports
  reachable/public + match count, mirroring the Ollama "Test connection" pattern.

### Implementation checklist — DONE (`bun run check` 0/0, `bun run build` ok)
- [x] Add `steamId64 String?` to `UserSettings`; add `WeaponStatSnapshot` model; migrate (`20260622202322_weapon_stats`).
- [x] `steam-api.ts` (fetch + typed `SteamApiError`), `weapon-catalog.ts` (whitelist + display names + categories),
      `normalizeWeaponStats` (pure, unit-testable).
- [x] `weapon-stats-repository.ts` (save/getLatest snapshot; payload JSON).
- [x] `/weapons` route: load (auto-fetch on first visit) + `?/refresh` action; overall cards, sortable table,
      two charts (`WeaponKills`, `WeaponAccuracy`), empty/error states (no steamId / private / unreachable).
- [x] Settings: SteamID64 field (two-way bound) + "Test Steam profile" action (`?/testSteam`).
- [x] Nav: added "Weapons".
- [x] `bun run check` 0/0, `bun run build` ok.
- [ ] **Manual verify (owner):** open `/weapons` on a live server with the SteamID set — confirm cards, charts, and
      table populate (validated against live API during build: AK-47 top, accuracy %, no pseudo-keys leaking).

**Implementation notes / decisions made during build:**
- Env access uses `process.env.STEAM_API_KEY` (matches the codebase's existing `process.env` pattern, not `$env`).
- Steam returns **403** for private game details, **400** for a bad id — mapped to typed `SteamApiError` kinds.
- `total_shots_hit` (overall) was absent for the test account → overall hits are **summed from per-weapon hits** as a fallback.
- Accuracy chart hides weapons with `< 100` shots (tiny samples skew %); the full table still lists every weapon.
- `m4a1` key = M4A4 + M4A1-S, `hkp2000` = P2000 + USP-S — reflected in display names per the catalog.

---

## Stretch Goal 2 — Automated capture via Game State Integration (GSI)  🔬 researched, parked

The **VAC-safe, Valve-sanctioned** way to automate per-match capture (same mechanism HLTV overlays and
stream tools use — explicitly allowed, no overlay injection, no memory reading).

- Drop a `gamestate_integration_csstats.cfg` in CS2's `cfg/` folder pointing at a localhost endpoint.
- CS2 **pushes** live game state (the player's own `player_state`: kills, assists, deaths, mvps, score,
  health, plus round/match/map context) to a local HTTP listener as you play.
- At match end you'd have your core scoreboard line **with no screenshot**.

**Why it's goal 2, not goal 1:** bigger lift than the Steam API — needs a small local listener process
(SvelteKit server can host the endpoint, but the user must run it locally during play), config-file
distribution, and it only covers **your own** player on **your own** machine. It also does **not** expose
ADR or lifetime weapon stats. Best layered in once weapon stats prove the value.

**Layered architecture (end state):**

| Layer | Source | Gives | Setup |
|---|---|---|---|
| MVP (done) | Screenshot + vision model | Per-match full scoreboard line, any machine | none |
| Goal 2 | GSI localhost listener | Per-match core stats, live, VAC-safe | cfg file + local app |
| Goal 1 | Steam Web API | Cumulative + per-session (diff) weapon kills & accuracy | API key + public profile |

All three feed the same Match/PlayerMatchStat/weapon schema — the existing pluggable parser design
already anticipates multiple sources.
