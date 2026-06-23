/**
 * Performance scoring. Each raw CS2 metric (different units) is mapped onto a common 0–100
 * skill score via piecewise-linear benchmark anchors, so the radar axes are comparable and the
 * Form score is a principled blend of the same component scores. Anchors are tuned for CS2
 * *casual* (stats run a bit higher than competitive) and are easy to retune in one place.
 */

export type MetricKey = "aim" | "damage" | "duels" | "winning" | "utility";

type Anchor = [raw: number, score: number];

interface MetricDef {
  name: string;
  unit: string;
  description: string;
  weight: number; // contribution to the Form score
  anchors: Anchor[];
}

// Base anchors are [raw, score] reference points calibrated to documented *competitive (5v5)*
// CS2 norms: ADR 70-80 good / 85-95 excellent / 95+ outstanding; HS% ~40-45 typical, 55-65 riflers;
// K/D 1.0 even, ~1.5 strong in matchmaking; utility ~50 light / 130 solid / 220+ heavy support.
// 100 = clearly elite, ~50 = solid/average. Casual (10v10) is handled by CASUAL_INFLATION below.
const METRICS: Record<MetricKey, MetricDef> = {
  duels: {
    name: "Duels",
    unit: "K/D",
    description: "Kill/death ratio. ~1.0 is even; 1.3 is strong, 1.6+ is dominant.",
    weight: 0.28,
    anchors: [[0.7, 15], [1.0, 50], [1.3, 72], [1.6, 88], [2.0, 100]],
  },
  damage: {
    name: "Damage",
    unit: "ADR",
    description: "Average damage per round. ~75 is solid, 85-95 excellent, 100+ outstanding.",
    weight: 0.24,
    anchors: [[50, 15], [72, 40], [85, 60], [95, 82], [110, 100]],
  },
  aim: {
    name: "Aim",
    unit: "HS%",
    description: "Headshot %. Most players sit 40-45%; consistent riflers reach 55-65%.",
    weight: 0.2,
    anchors: [[20, 15], [35, 40], [45, 58], [55, 80], [65, 100]],
  },
  winning: {
    name: "Winning",
    unit: "Win%",
    description: "Share of tracked matches won. 50% is even.",
    weight: 0.18,
    anchors: [[30, 15], [45, 42], [50, 55], [65, 82], [80, 100]],
  },
  utility: {
    name: "Utility",
    unit: "UD/match",
    description: "Utility damage per match (10v10-calibrated). ~90 is light, ~190 solid, 330+ is heavy support.",
    weight: 0.1,
    anchors: [[15, 15], [50, 35], [110, 55], [190, 80], [280, 100]],
  },
};

// 10v10 casual inflates a couple of metrics vs 5v5 competitive (more targets per round; grenades
// hit clustered groups). We raise the bar for those by scaling their anchor thresholds. HS%, win
// rate, and K/D (a ratio) are ~player-count independent, so they stay at 1.0. Estimates — tunable.
const CASUAL_INFLATION: Partial<Record<MetricKey, number>> = {
  damage: 1.15,
  utility: 1.7,
};

const ORDER: MetricKey[] = ["aim", "damage", "duels", "winning", "utility"];

function interpolate(anchors: Anchor[], raw: number): number {
  if (raw <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i += 1) {
    const [x1, y1] = anchors[i - 1];
    const [x2, y2] = anchors[i];
    if (raw <= x2) return Math.round(y1 + ((raw - x1) / (x2 - x1)) * (y2 - y1));
  }
  return anchors[anchors.length - 1][1];
}

export interface PerformanceMetric {
  key: MetricKey;
  name: string;
  unit: string;
  description: string;
  raw: number | null;
  rawLabel: string;
  score: number; // 0–100
}

export interface PerformanceInput {
  hsPercent: number | null;
  adr: number | null;
  kd: number;
  winRate: number;
  utilityDamage: number | null;
}

const RAW_BY_KEY = (input: PerformanceInput): Record<MetricKey, number | null> => ({
  aim: input.hsPercent,
  damage: input.adr,
  duels: input.kd,
  winning: input.winRate,
  utility: input.utilityDamage,
});

// 5v5 modes use the base (competitive) anchors; everything else (casual, "All", unknown) gets the
// 10v10 inflation. Wingman is smaller still but rare — treated as base, close enough.
const FIVE_V_FIVE_MODES = new Set(["competitive", "premier", "wingman"]);

export function buildPerformanceMetrics(input: PerformanceInput, mode = "Casual"): PerformanceMetric[] {
  const raws = RAW_BY_KEY(input);
  const inflate = !FIVE_V_FIVE_MODES.has(mode.toLowerCase());
  return ORDER.map((key) => {
    const def = METRICS[key];
    const raw = raws[key];
    const factor = inflate ? CASUAL_INFLATION[key] ?? 1 : 1;
    const anchors = factor === 1 ? def.anchors : (def.anchors.map(([x, y]) => [x * factor, y]) as Anchor[]);
    const label =
      raw === null ? "—" : key === "aim" || key === "winning" ? `${raw}%` : key === "duels" ? raw.toFixed(2) : `${Math.round(raw)}`;
    return {
      key,
      name: def.name,
      unit: def.unit,
      description: def.description,
      raw,
      rawLabel: label,
      score: raw === null ? 0 : interpolate(anchors, raw),
    };
  });
}

export interface FormScore {
  score: number; // 0–100
  tier: string;
  color: string;
}

const TIERS: { min: number; tier: string; color: string }[] = [
  { min: 88, tier: "Insane", color: "#FF4D6D" },
  { min: 76, tier: "Cracked", color: "#F2A900" },
  { min: 62, tier: "Sharp", color: "#2ED573" },
  { min: 48, tier: "Steady", color: "#4A9EFF" },
  { min: 32, tier: "Warming up", color: "#9B5DE5" },
  { min: 0, tier: "Rusty", color: "#8A929C" },
];

/** Weighted blend of component scores. Metrics with no data are excluded and weights renormalized. */
export function computeFormScore(metrics: PerformanceMetric[]): FormScore {
  const present = metrics.filter((m) => m.raw !== null);
  const weights = present.map((m) => METRICS[m.key].weight);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const score =
    totalWeight === 0 ? 0 : Math.round(present.reduce((s, m, i) => s + m.score * weights[i], 0) / totalWeight);
  const tier = TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
  return { score, tier: tier.tier, color: tier.color };
}

/** Daily match counts over the last `days` days (inclusive of today), oldest first. */
export function buildActivity(playedAt: string[], days: number): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const iso of playedAt) {
    const key = iso.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}
