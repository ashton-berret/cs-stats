import type { WeaponCategory } from "$lib/types/weapons";

/** Category accent colors for weapon charts (client-safe; mirrors the CS2 chart palette). */
export const CATEGORY_COLORS: Record<WeaponCategory, string> = {
  rifle: "#F2A900",
  sniper: "#4A9EFF",
  smg: "#2ED573",
  pistol: "#9B5DE5",
  heavy: "#FF6B35",
  equipment: "#6C757D",
};

export const CATEGORY_LABELS: Record<WeaponCategory, string> = {
  rifle: "Rifles",
  sniper: "Snipers",
  smg: "SMGs",
  pistol: "Pistols",
  heavy: "Heavy",
  equipment: "Equipment",
};
