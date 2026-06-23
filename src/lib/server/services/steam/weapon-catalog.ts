import type { WeaponCategory } from "$lib/types/weapons";

interface WeaponInfo {
  display: string;
  category: WeaponCategory;
}

/**
 * Whitelist of real CS2 weapon stat keys -> display name + category.
 * The Steam API returns `total_kills_<key>` / `total_shots_<key>` / `total_hits_<key>`.
 * Only keys in this map are surfaced, which filters out pseudo-keys like
 * `total_kills_headshot`, `total_kills_enemy_blinded`, `total_kills_enemy_weapon`, etc.
 *
 * Combined keys (one stat covers multiple skins): `m4a1` = M4A4 + M4A1-S,
 * `hkp2000` = P2000 + USP-S. Display names reflect that.
 */
export const WEAPON_CATALOG: Record<string, WeaponInfo> = {
  // Rifles
  ak47: { display: "AK-47", category: "rifle" },
  m4a1: { display: "M4A4 / M4A1-S", category: "rifle" },
  galilar: { display: "Galil AR", category: "rifle" },
  famas: { display: "FAMAS", category: "rifle" },
  aug: { display: "AUG", category: "rifle" },
  sg556: { display: "SG 553", category: "rifle" },
  // Snipers
  awp: { display: "AWP", category: "sniper" },
  ssg08: { display: "SSG 08", category: "sniper" },
  scar20: { display: "SCAR-20", category: "sniper" },
  g3sg1: { display: "G3SG1", category: "sniper" },
  // SMGs
  mac10: { display: "MAC-10", category: "smg" },
  mp9: { display: "MP9", category: "smg" },
  mp7: { display: "MP7", category: "smg" },
  mp5sd: { display: "MP5-SD", category: "smg" },
  ump45: { display: "UMP-45", category: "smg" },
  p90: { display: "P90", category: "smg" },
  bizon: { display: "PP-Bizon", category: "smg" },
  // Pistols
  glock: { display: "Glock-18", category: "pistol" },
  hkp2000: { display: "P2000 / USP-S", category: "pistol" },
  p250: { display: "P250", category: "pistol" },
  deagle: { display: "Desert Eagle", category: "pistol" },
  elite: { display: "Dual Berettas", category: "pistol" },
  fiveseven: { display: "Five-SeveN", category: "pistol" },
  tec9: { display: "Tec-9", category: "pistol" },
  cz75a: { display: "CZ75-Auto", category: "pistol" },
  revolver: { display: "R8 Revolver", category: "pistol" },
  // Heavy
  nova: { display: "Nova", category: "heavy" },
  xm1014: { display: "XM1014", category: "heavy" },
  mag7: { display: "MAG-7", category: "heavy" },
  sawedoff: { display: "Sawed-Off", category: "heavy" },
  m249: { display: "M249", category: "heavy" },
  negev: { display: "Negev", category: "heavy" },
  // Equipment (kills only, no shots/hits)
  knife: { display: "Knife", category: "equipment" },
  hegrenade: { display: "HE Grenade", category: "equipment" },
  molotov: { display: "Molotov / Incendiary", category: "equipment" },
  taser: { display: "Zeus x27", category: "equipment" },
};
