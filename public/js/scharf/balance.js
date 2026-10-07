export const COLS = 16;
export const ROWS = 10;
export const CELL = 60;
export const WORLD_W = COLS * CELL;
export const WORLD_H = ROWS * CELL;
export const WAYPOINTS = [
    [0, 2],
    [6, 2],
    [6, 7],
    [2, 7],
    [2, 4],
    [11, 4],
    [11, 8],
    [15, 8],
];
export const START_GOLD = 170;
export const START_LIVES = 15;
export const SELL_RATE = 0.55;
export const MAX_RANK = 3;
export const DMG_MULT = [1, 1.42, 1.95, 2.65];
export const RATE_MULT = [1, 0.8, 0.64, 0.5];
export const TOWERS = {
    mg: {
        id: "mg",
        name: "Maschinengewehr",
        short: "MG",
        blurb: "Kurze Reichweite, hohes Tempo. Hält Schwärme an den Biegungen.",
        cost: 80,
        range: 122,
        minRange: 0,
        damage: 6,
        interval: 0.26,
        splash: 0,
        pen: 0,
        bulletSpeed: 460,
        barrel: 18,
    },
    sniper: {
        id: "sniper",
        name: "Scharfschütze",
        short: "Scharf",
        blurb: "Sehr weite Sicht, schwerer Schuss, durchschlägt Panzerung. Langsam.",
        cost: 175,
        range: 280,
        minRange: 0,
        damage: 54,
        interval: 1.42,
        splash: 0,
        pen: 0.78,
        bulletSpeed: 0,
        barrel: 28,
    },
    mortar: {
        id: "mortar",
        name: "Mörser",
        short: "Mörser",
        blurb: "Flächenschaden mit toter Zone im Nahbereich. Trifft Gruppen auf der Geraden.",
        cost: 140,
        range: 190,
        minRange: 74,
        damage: 22,
        interval: 1.65,
        splash: 68,
        pen: 0.15,
        bulletSpeed: 0,
        barrel: 14,
    },
};
export const ENEMIES = {
    infantry: {
        id: "infantry",
        name: "Infanterie",
        hp: 64,
        speed: 72,
        gold: 7,
        armor: 0,
        radius: 11,
        leak: 1,
    },
    runner: {
        id: "runner",
        name: "Späher",
        hp: 40,
        speed: 116,
        gold: 8,
        armor: 0,
        radius: 9,
        leak: 1,
    },
    tank: {
        id: "tank",
        name: "Panzer",
        hp: 420,
        speed: 40,
        gold: 18,
        armor: 0.5,
        radius: 15,
        leak: 2,
    },
    boss: {
        id: "boss",
        name: "Koloss",
        hp: 2400,
        speed: 30,
        gold: 90,
        armor: 0.38,
        radius: 20,
        leak: 8,
    },
};
export const WAVES = [
    { groups: [{ type: "infantry", count: 8, interval: 0.85 }], bonus: 6 },
    { groups: [{ type: "infantry", count: 12, interval: 0.62 }], bonus: 8 },
    {
        groups: [
            { type: "infantry", count: 8, interval: 0.6 },
            { type: "runner", count: 7, interval: 0.48 },
        ],
        bonus: 8,
    },
    {
        groups: [
            { type: "runner", count: 12, interval: 0.36 },
            { type: "infantry", count: 8, interval: 0.5 },
        ],
        bonus: 10,
    },
    {
        groups: [
            { type: "tank", count: 4, interval: 1.25 },
            { type: "infantry", count: 8, interval: 0.5 },
        ],
        bonus: 12,
    },
    {
        groups: [
            { type: "runner", count: 14, interval: 0.32 },
            { type: "tank", count: 4, interval: 1.05 },
        ],
        bonus: 12,
    },
    {
        groups: [
            { type: "infantry", count: 16, interval: 0.36 },
            { type: "tank", count: 6, interval: 0.9 },
        ],
        bonus: 14,
    },
    {
        groups: [
            { type: "runner", count: 12, interval: 0.3 },
            { type: "tank", count: 7, interval: 0.8 },
            { type: "infantry", count: 10, interval: 0.34 },
        ],
        bonus: 14,
    },
    {
        groups: [
            { type: "tank", count: 9, interval: 0.7 },
            { type: "runner", count: 14, interval: 0.28 },
        ],
        bonus: 16,
    },
    {
        groups: [
            { type: "runner", count: 8, interval: 0.3 },
            { type: "tank", count: 5, interval: 0.75 },
            { type: "boss", count: 1, interval: 0.2 },
        ],
        bonus: 0,
    },
];
const DMG_COST = [0.85, 1.35, 2.05];
const RATE_COST = [0.7, 1.15, 1.75];
export function upgradeCost(type, kind, rank) {
    if (rank < 0 || rank >= MAX_RANK)
        return 0;
    const table = kind === "damage" ? DMG_COST : RATE_COST;
    return Math.round((TOWERS[type].cost * table[rank]) / 5) * 5;
}
export function towerDamage(type, dmgRank) {
    return TOWERS[type].damage * DMG_MULT[dmgRank];
}
export function towerInterval(type, rateRank) {
    return TOWERS[type].interval * RATE_MULT[rateRank];
}
export function mitigatedDamage(raw, armor, pen) {
    const effective = armor * (1 - pen);
    return raw * (1 - effective);
}
function cellKey(c, r) {
    return `${c},${r}`;
}
function buildPath() {
    const cells = [];
    const seen = new Set();
    const add = (c, r) => {
        const k = cellKey(c, r);
        if (seen.has(k))
            return;
        seen.add(k);
        cells.push({ c, r });
    };
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
        const [c0, r0] = WAYPOINTS[i];
        const [c1, r1] = WAYPOINTS[i + 1];
        const dc = Math.sign(c1 - c0);
        const dr = Math.sign(r1 - r0);
        let c = c0;
        let r = r0;
        while (c !== c1 || r !== r1) {
            add(c, r);
            if (c !== c1)
                c += dc;
            else
                r += dr;
        }
    }
    const last = WAYPOINTS[WAYPOINTS.length - 1];
    add(last[0], last[1]);
    const points = cells.map((cell) => ({
        x: cell.c * CELL + CELL / 2,
        y: cell.r * CELL + CELL / 2,
    }));
    const first = points[0];
    const end = points[points.length - 1];
    points.unshift({ x: -CELL * 0.35, y: first.y });
    points.push({ x: WORLD_W + CELL * 0.45, y: end.y });
    return { cells, points, seen };
}
const built = buildPath();
export const PATH_CELLS = built.cells;
export const PATH_POINTS = built.points;
export const PATH_SET = built.seen;
export function isPath(c, r) {
    return PATH_SET.has(cellKey(c, r));
}
export function cellCenter(c, r) {
    return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}
export function cellAt(x, y) {
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS)
        return null;
    return { c, r };
}
export function waveLabel(index) {
    const wave = WAVES[index];
    if (!wave)
        return "";
    return wave.groups.map((g) => `${g.count} ${ENEMIES[g.type].name}`).join(" · ");
}
export function waveTotal(index) {
    const wave = WAVES[index];
    if (!wave)
        return 0;
    return wave.groups.reduce((sum, g) => sum + g.count, 0);
}
export const TARGET_LABEL = {
    first: "Erster",
    last: "Letzter",
    close: "Nächster",
    strong: "Stärkster",
};
export const TARGET_ORDER = ["first", "last", "close", "strong"];
