import { CELL, COLS, PATH_POINTS, ROWS, TOWERS, WORLD_H, WORLD_W, isPath, } from "./balance.js";
let bg = null;
function hash(n) {
    let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function tracePath(ctx) {
    const pts = PATH_POINTS;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++)
        ctx.lineTo(pts[i].x, pts[i].y);
}
function bakeBackground() {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = WORLD_W * scale;
    canvas.height = WORLD_H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return canvas;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#141c12";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const n = hash(c * 67 + r * 19 + 3);
            const g = 22 + Math.floor(n * 16);
            ctx.fillStyle = `rgb(${g - 4}, ${g + 10}, ${g - 6})`;
            ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
            if ((c + r) % 2 === 0) {
                ctx.fillStyle = "rgba(243,236,218,0.015)";
                ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
            }
        }
    }
    ctx.strokeStyle = "rgba(243,236,218,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= COLS; c++) {
        ctx.moveTo(c * CELL + 0.5, 0);
        ctx.lineTo(c * CELL + 0.5, WORLD_H);
    }
    for (let r = 0; r <= ROWS; r++) {
        ctx.moveTo(0, r * CELL + 0.5);
        ctx.lineTo(WORLD_W, r * CELL + 0.5);
    }
    ctx.stroke();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#2a2118";
    ctx.lineWidth = 50;
    tracePath(ctx);
    ctx.stroke();
    ctx.strokeStyle = "#6a5140";
    ctx.lineWidth = 40;
    tracePath(ctx);
    ctx.stroke();
    ctx.strokeStyle = "#8c6e54";
    ctx.lineWidth = 18;
    tracePath(ctx);
    ctx.stroke();
    ctx.setLineDash([3, 11]);
    ctx.strokeStyle = "rgba(40,28,18,0.35)";
    ctx.lineWidth = 2;
    tracePath(ctx);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 2; i < PATH_POINTS.length - 2; i += 3) {
        const a = PATH_POINTS[i - 1];
        const b = PATH_POINTS[i];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.strokeStyle = "rgba(243,236,218,0.28)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, -5);
        ctx.lineTo(2, 0);
        ctx.lineTo(-6, 5);
        ctx.stroke();
        ctx.restore();
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (isPath(c, r))
                continue;
            const n = hash(c * 13 + r * 91);
            const cx = c * CELL + 8 + n * (CELL - 16);
            const cy = r * CELL + 10 + hash(c + r * 5) * (CELL - 20);
            if (n > 0.72) {
                ctx.fillStyle = n > 0.88 ? "#24321c" : "#1c2918";
                ctx.beginPath();
                ctx.ellipse(cx, cy, 7 + n * 6, 3.2, n * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "rgba(180,200,140,0.18)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - 4, cy);
                ctx.quadraticCurveTo(cx - 1, cy - 7, cx + 1, cy - 1);
                ctx.stroke();
            }
            else if (n < 0.08) {
                ctx.fillStyle = "#3a4034";
                ctx.beginPath();
                ctx.ellipse(cx, cy, 5, 3.4, 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    const gate = PATH_POINTS[PATH_POINTS.length - 2];
    ctx.fillStyle = "#2c261c";
    ctx.fillRect(gate.x + 8, gate.y - 28, 8, 56);
    ctx.fillRect(gate.x + 8, gate.y - 28, 26, 7);
    ctx.fillStyle = "#e25b45";
    ctx.fillRect(gate.x + 16, gate.y - 24, 10, 4);
    const spawn = PATH_POINTS[1];
    ctx.fillStyle = "rgba(224,168,74,0.85)";
    ctx.fillRect(4, spawn.y - 16, 3, 32);
    const vignette = ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.25, WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.68);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    return canvas;
}
function drawTowerShape(ctx, tower, alpha) {
    const def = TOWERS[tower.type];
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (tower.type === "mg") {
        ctx.fillStyle = "#6d6248";
        ctx.beginPath();
        ctx.ellipse(0, 2, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#cbb98a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#3e4634";
        ctx.fillRect(-7, -6, 14, 12);
    }
    else if (tower.type === "sniper") {
        ctx.fillStyle = "#3d4a38";
        ctx.beginPath();
        ctx.moveTo(-16, 8);
        ctx.lineTo(0, -12);
        ctx.lineTo(16, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#d5d2c4";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = "#1c2218";
        ctx.fillRect(-6, -4, 12, 10);
    }
    else {
        ctx.fillStyle = "#3a332c";
        ctx.beginPath();
        ctx.arc(0, 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#a8643e";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#2a241e";
        ctx.beginPath();
        ctx.arc(0, 2, 7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.rotate(tower.angle);
    ctx.fillStyle = tower.type === "mortar" ? "#d7c4b0" : tower.type === "sniper" ? "#e7e2d4" : "#1b1e18";
    const len = def.barrel;
    const thick = tower.type === "mortar" ? 5 : tower.type === "sniper" ? 2.2 : 3.2;
    ctx.fillRect(4, -thick / 2, len, thick);
    if (tower.type === "mg")
        ctx.fillRect(4, -thick / 2 - 2.4, len - 4, 1.6);
    if (tower.type === "sniper") {
        ctx.fillStyle = "#9eb89a";
        ctx.fillRect(len * 0.45, -3.2, 5, 2.2);
    }
    ctx.restore();
}
function drawEnemy(ctx, type, x, y, ang, radius, flash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    if (type === "boss") {
        ctx.fillStyle = flash > 0 ? "#f3ecda" : "#6a3a32";
        ctx.fillRect(-radius, -radius * 0.72, radius * 2, radius * 1.44);
        ctx.fillStyle = "#e25b45";
        ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = "#2a241e";
        ctx.fillRect(-radius, -radius * 0.9, radius * 2, 4);
        ctx.fillRect(-radius, radius * 0.62, radius * 2, 4);
    }
    else if (type === "tank") {
        ctx.fillStyle = "#2a3028";
        ctx.fillRect(-radius, -radius * 0.78, radius * 2, radius * 1.56);
        ctx.fillStyle = flash > 0 ? "#f3ecda" : "#4e5848";
        ctx.fillRect(-radius * 0.7, -radius * 0.5, radius * 1.5, radius);
        ctx.fillStyle = "#1c2218";
        ctx.fillRect(0, -2, radius * 0.7, 4);
    }
    else if (type === "runner") {
        ctx.fillStyle = flash > 0 ? "#f3ecda" : "#d7c07a";
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.7, radius * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3e4634";
        ctx.beginPath();
        ctx.arc(radius * 0.25, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();
    }
    else {
        ctx.fillStyle = flash > 0 ? "#f3ecda" : "#6e7c4e";
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.78, radius * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d9cbb4";
        ctx.beginPath();
        ctx.arc(radius * 0.15, 0, 3.4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
let reduceMotion = false;
if (typeof window !== "undefined" && window.matchMedia) {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function render(ctx, sim, view) {
    if (!bg)
        bg = bakeBackground();
    const mag = reduceMotion ? 0 : sim.shake * 8;
    const sx = Math.sin(sim.time * 47) * mag;
    const sy = Math.cos(sim.time * 41) * mag;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#0c100b";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + sx, view.oy + sy);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bg, 0, 0, WORLD_W, WORLD_H);
    const focusType = sim.placing ?? (sim.towers.find((t) => t.id === sim.selectedId)?.type ?? null);
    const focusTower = sim.towers.find((t) => t.id === sim.selectedId) ?? null;
    if (sim.hover && (sim.placing || focusTower)) {
        const def = TOWERS[sim.placing ?? focusTower.type];
        const hx = sim.hover.c * CELL + CELL / 2;
        const hy = sim.hover.r * CELL + CELL / 2;
        const valid = !isPath(sim.hover.c, sim.hover.r) && !sim.towers.some((t) => t.c === sim.hover.c && t.r === sim.hover.r);
        if (sim.placing) {
            ctx.fillStyle = valid ? "rgba(224,168,74,0.16)" : "rgba(226,91,69,0.2)";
            ctx.fillRect(sim.hover.c * CELL + 2, sim.hover.r * CELL + 2, CELL - 4, CELL - 4);
        }
        const ox = sim.placing ? hx : focusTower.x;
        const oy = sim.placing ? hy : focusTower.y;
        ctx.beginPath();
        ctx.arc(ox, oy, def.range, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(224,168,74,0.07)";
        ctx.fill();
        ctx.strokeStyle = "rgba(224,168,74,0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (def.minRange > 0) {
            ctx.beginPath();
            ctx.arc(ox, oy, def.minRange, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(226,91,69,0.7)";
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    else if (focusTower && focusType) {
        const def = TOWERS[focusType];
        ctx.beginPath();
        ctx.arc(focusTower.x, focusTower.y, def.range, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(224,168,74,0.45)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (def.minRange > 0) {
            ctx.beginPath();
            ctx.arc(focusTower.x, focusTower.y, def.minRange, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(226,91,69,0.65)";
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    if (focusTower) {
        ctx.strokeStyle = "#e0a84a";
        ctx.lineWidth = 2;
        ctx.strokeRect(focusTower.c * CELL + 3, focusTower.r * CELL + 3, CELL - 6, CELL - 6);
    }
    for (const tower of sim.towers)
        drawTowerShape(ctx, tower, 1);
    if (sim.placing && sim.hover && !isPath(sim.hover.c, sim.hover.r)) {
        const ghost = {
            id: -1,
            type: sim.placing,
            c: sim.hover.c,
            r: sim.hover.r,
            x: sim.hover.c * CELL + CELL / 2,
            y: sim.hover.r * CELL + CELL / 2,
            dmgRank: 0,
            rateRank: 0,
            cool: 0,
            angle: -Math.PI / 2,
            mode: "first",
            invested: 0,
        };
        drawTowerShape(ctx, ghost, 0.55);
    }
    const enemies = [...sim.enemies].sort((a, b) => a.y - b.y);
    for (const enemy of enemies) {
        if (!enemy.alive)
            continue;
        const dest = PATH_POINTS[enemy.wp] ?? PATH_POINTS[PATH_POINTS.length - 1];
        const ang = Math.atan2(dest.y - enemy.y, dest.x - enemy.x);
        drawEnemy(ctx, enemy.type, enemy.x, enemy.y, ang, enemy.radius, enemy.flash);
        if (enemy.hp < enemy.maxHp || enemy.type === "tank" || enemy.type === "boss") {
            const w = enemy.type === "boss" ? 36 : 22;
            const ratio = Math.max(0, enemy.hp / enemy.maxHp);
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 9, w, 4);
            ctx.fillStyle = ratio > 0.45 ? "#8fbf6a" : "#e25b45";
            ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 9, w * ratio, 4);
        }
    }
    for (const beam of sim.beams) {
        const a = Math.max(0, beam.life / beam.max);
        ctx.strokeStyle = `rgba(243,236,218,${a})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(beam.x1, beam.y1);
        ctx.lineTo(beam.x2, beam.y2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(224,168,74,${a * 0.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    for (const bullet of sim.bullets) {
        if (bullet.kind === "shell") {
            const lift = Math.sin(Math.min(1, bullet.t) * Math.PI) * 36;
            ctx.fillStyle = "rgba(224,168,74,0.25)";
            ctx.beginPath();
            ctx.arc(bullet.tx, bullet.ty, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(226,91,69,0.45)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(bullet.tx, bullet.ty, TOWERS.mortar.splash, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "#2a241e";
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y - lift, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#e0a84a";
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y - lift, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
        else {
            ctx.fillStyle = "#f3ecda";
            ctx.fillRect(bullet.x - 2, bullet.y - 1, 5, 2);
        }
    }
    for (const p of sim.particles) {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        if (p.kind === "ring") {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * (1 - a), 0, Math.PI * 2);
            ctx.stroke();
        }
        else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    ctx.font = "600 13px Figtree, sans-serif";
    ctx.textAlign = "center";
    for (const f of sim.floaters) {
        ctx.globalAlpha = Math.max(0, f.life / f.max);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
    }
    if (sim.alarm > 0) {
        ctx.fillStyle = `rgba(226,91,69,${sim.alarm * 0.22})`;
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}
