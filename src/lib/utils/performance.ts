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

const METRICS: Record<MetricKey, MetricDef> = {
  duels: {
    name: "Duels",
    unit: "K/D",
    description: "Kill/death ratio — how often you win your gunfights.",
    weight: 0.28,
    anchors: [[0.6, 15], [0.9, 40], [1.2, 65], [1.6, 90], [2.0, 100]],
  },
  damage: {
    name: "Damage",
    unit: "ADR",
    description: "Average damage per round — your overall round-by-round impact.",
    weight: 0.24,
    anchors: [[50, 20], [75, 45], [95, 70], [120, 95], [140, 100]],
  },
  aim: {
    name: "Aim",
    unit: "HS%",
    description: "Headshot percentage — a proxy for crosshair placement and precision.",
    weight: 0.2,
    anchors: [[15, 20], [30, 45], [45, 70], [60, 95], [70, 100]],
  },
  winning: {
    name: "Winning",
    unit: "Win%",
    description: "Share of tracked matches you've won.",
    weight: 0.18,
    anchors: [[25, 15], [45, 45], [55, 60], [70, 85], [85, 100]],
  },
  utility: {
    name: "Utility",
    unit: "UD/match",
    description: "Average utility damage per match — grenade value and map control.",
    weight: 0.1,
    anchors: [[3, 15], [12, 40], [25, 65], [45, 90], [70, 100]],
  },
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

export function buildPerformanceMetrics(input: PerformanceInput): PerformanceMetric[] {
  const raws = RAW_BY_KEY(input);
  return ORDER.map((key) => {
    const def = METRICS[key];
    const raw = raws[key];
    const label =
      raw === null ? "—" : key === "aim" || key === "winning" ? `${raw}%` : key === "duels" ? raw.toFixed(2) : `${Math.round(raw)}`;
    return {
      key,
      name: def.name,
      unit: def.unit,
      description: def.description,
      raw,
      rawLabel: label,
      score: raw === null ? 0 : interpolate(def.anchors, raw),
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
