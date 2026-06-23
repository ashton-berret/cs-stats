/** Minimal subset of the CS2 Game State Integration payload we rely on. All fields optional —
 * GSI only sends components that changed, so every read must be defensive. */
export interface GsiPayload {
  provider?: { steamid?: string; timestamp?: number };
  map?: {
    mode?: string;
    name?: string;
    phase?: string; // "warmup" | "live" | "intermission" | "gameover"
    round?: number;
    team_ct?: { score?: number };
    team_t?: { score?: number };
  };
  round?: { phase?: string };
  player?: {
    steamid?: string;
    name?: string;
    team?: string; // "CT" | "T"
    match_stats?: { kills?: number; assists?: number; deaths?: number; mvps?: number; score?: number };
  };
  auth?: { token?: string };
}
