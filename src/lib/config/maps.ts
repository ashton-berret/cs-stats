export interface MapInfo {
    name: string;
    color: string;
}

export const CS2_MAPS: MapInfo[] = [
    { name: "Mirage", color: "#E8A33D" },
    { name: "Inferno", color: "#FF6B35" },
    { name: "Dust II", color: "#E0C068" },
    { name: "Nuke", color: "#5BC0BE" },
    { name: "Overpass", color: "#7FB069" },
    { name: "Ancient", color: "#3D8C5C" },
    { name: "Anubis", color: "#C9A227" },
    { name: "Vertigo", color: "#8E9AAF" },
    { name: "Train", color: "#6C757D" },
    { name: "Office", color: "#9B5DE5" },
    { name: "Italy", color: "#F15BB5" },
];

export const MAP_NAMES = CS2_MAPS.map((m) => m.name);

const MAP_COLOR = new Map(CS2_MAPS.map((m) => [m.name, m.color]));

export const mapColor = (name: string): string => MAP_COLOR.get(name) ?? "#4A9EFF";
