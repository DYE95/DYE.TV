import { CELL, ENEMIES, MAX_RANK, PATH_POINTS, SELL_RATE, START_GOLD, START_LIVES, TARGET_ORDER, TOWERS, WAVES, cellAt, cellCenter, isPath, mitigatedDamage, towerDamage, towerInterval, upgradeCost, waveLabel, } from "./balance.js";
import { playHit, playShot, playUi } from "./audio.js";
const SAVE_KEY = "scharfschuss-v1";
export function loadSave() {
    if (typeof localStorage === "undefined")
        return { bestWave: 0, bestKills: 0, bestScore: 0 };
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw)
            return { bestWave: 0, bestKills: 0, bestScore: 0 };
        const parsed = JSON.parse(raw);
        return {
            bestWave: Number(parsed.bestWave) || 0,
            bestKills: Number(parsed.bestKills) || 0,
            bestScore: Number(parsed.bestScore) || 0,
        };
    }
    catch {
        return { bestWave: 0, bestKills: 0, bestScore: 0 };
    }
}
function writeSave(data) {
    if (typeof localStorage === "undefined")
        return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI)
        d -= Math.PI * 2;
    while (d < -Math.PI)
        d += Math.PI * 2;
    return a + d * t;
}
let seq = 1;
export class Sim {
    phase = "prep";
    gold = START_GOLD;
    lives = START_LIVES;
    waveIndex = 0;
    kills = 0;
    goldEarned = 0;
    leaks = 0;
    paused = false;
    speed = 1;
    placing = null;
    selectedId = null;
    notice = "";
    noticeLife = 0;
    time = 0;
    shake = 0;
    alarm = 0;
    hover = null;
    ended = false;
    towers = [];
    enemies = [];
    bullets = [];
    beams = [];
    particles = [];
    floaters = [];
    groupIndex = 0;
    spawnedInGroup = 0;
    spawnTimer = 0;
    spawning = false;
    best = { bestWave: 0, bestKills: 0, bestScore: 0 };
    constructor() {
        this.best = loadSave();
    }
    get score() {
        const clear = this.phase === "won" ? 500 : 0;
        return this.kills * 10 + this.lives * 15 + this.waveIndex * 25 + clear;
    }
    reset() {
        this.phase = "prep";
        this.gold = START_GOLD;
        this.lives = START_LIVES;
        this.waveIndex = 0;
        this.kills = 0;
        this.goldEarned = 0;
        this.leaks = 0;
        this.paused = false;
        this.speed = 1;
        this.placing = null;
        this.selectedId = null;
        this.notice = "";
        this.noticeLife = 0;
        this.time = 0;
        this.shake = 0;
        this.alarm = 0;
        this.ended = false;
        this.towers = [];
        this.enemies = [];
        this.bullets = [];
        this.beams = [];
        this.particles = [];
        this.floaters = [];
        this.groupIndex = 0;
        this.spawnedInGroup = 0;
        this.spawnTimer = 0;
        this.spawning = false;
    }
    say(text) {
        this.notice = text;
        this.noticeLife = 1.35;
    }
    togglePlace(type) {
        this.selectedId = null;
        this.placing = this.placing === type ? null : type;
    }
    setHover(c, r) {
        if (c === null || r === null)
            this.hover = null;
        else
            this.hover = { c, r };
    }
    clickCell(c, r) {
        if (this.phase === "won" || this.phase === "lost")
            return;
        const tower = this.towers.find((t) => t.c === c && t.r === r);
        if (tower) {
            this.selectedId = tower.id;
            this.placing = null;
            playUi("click");
            return;
        }
        if (!this.placing) {
            this.selectedId = null;
            return;
        }
        this.tryPlace(this.placing, c, r);
    }
    tryPlace(type, c, r) {
        if (this.phase === "won" || this.phase === "lost")
            return false;
        const def = TOWERS[type];
        if (c < 0 || r < 0)
            return false;
        if (isPath(c, r)) {
            this.say("Auf dem Weg steht kein Geschütz");
            playUi("deny");
            return false;
        }
        if (this.towers.some((t) => t.c === c && t.r === r)) {
            this.say("Feld besetzt");
            playUi("deny");
            return false;
        }
        if (this.gold < def.cost) {
            this.say("Zu wenig Gold");
            playUi("deny");
            return false;
        }
        const center = cellCenter(c, r);
        this.gold -= def.cost;
        const tower = {
            id: seq++,
            type,
            c,
            r,
            x: center.x,
            y: center.y,
            dmgRank: 0,
            rateRank: 0,
            cool: 0.15,
            angle: -Math.PI / 2,
            mode: "first",
            invested: def.cost,
        };
        this.towers.push(tower);
        this.selectedId = tower.id;
        this.placing = null;
        playUi("click");
        return true;
    }
    selectedTower() {
        return this.towers.find((t) => t.id === this.selectedId) ?? null;
    }
    upgrade(kind) {
        const tower = this.selectedTower();
        if (!tower || this.phase === "won" || this.phase === "lost")
            return false;
        const rank = kind === "damage" ? tower.dmgRank : tower.rateRank;
        if (rank >= MAX_RANK)
            return false;
        const cost = upgradeCost(tower.type, kind, rank);
        if (this.gold < cost) {
            this.say("Zu wenig Gold");
            playUi("deny");
            return false;
        }
        this.gold -= cost;
        tower.invested += cost;
        if (kind === "damage")
            tower.dmgRank += 1;
        else
            tower.rateRank += 1;
        playUi("click");
        this.spark(tower.x, tower.y, "#e0a84a", 8);
        return true;
    }
    cycleTarget() {
        const tower = this.selectedTower();
        if (!tower)
            return;
        const i = TARGET_ORDER.indexOf(tower.mode);
        tower.mode = TARGET_ORDER[(i + 1) % TARGET_ORDER.length];
        playUi("click");
    }
    sell() {
        const tower = this.selectedTower();
        if (!tower || this.phase === "won" || this.phase === "lost")
            return false;
        const refund = Math.floor(tower.invested * SELL_RATE);
        this.gold += refund;
        this.towers = this.towers.filter((t) => t.id !== tower.id);
        this.selectedId = null;
        this.floater(tower.x, tower.y - 16, `+${refund}`, "#e0a84a");
        playUi("click");
        return true;
    }
    startWave() {
        if (this.phase !== "prep")
            return;
        this.phase = "combat";
        this.spawning = true;
        this.groupIndex = 0;
        this.spawnedInGroup = 0;
        this.spawnTimer = 0.35;
        this.paused = false;
        playUi("wave");
    }
    togglePause() {
        if (this.phase !== "combat")
            return;
        this.paused = !this.paused;
    }
    setSpeed(speed) {
        this.speed = speed;
    }
    spawn(type) {
        const def = ENEMIES[type];
        const origin = PATH_POINTS[0];
        const enemy = {
            id: seq++,
            type,
            hp: def.hp,
            maxHp: def.hp,
            x: origin.x,
            y: origin.y,
            wp: 1,
            traveled: 0,
            alive: true,
            flash: 0,
            radius: def.radius,
            speed: def.speed,
            armor: def.armor,
            gold: def.gold,
            leak: def.leak,
        };
        this.enemies.push(enemy);
    }
    leak(enemy) {
        enemy.alive = false;
        if (this.phase === "lost")
            return;
        this.lives -= enemy.leak;
        this.leaks += 1;
        this.alarm = 1;
        this.shake = Math.min(1, this.shake + 0.55);
        const gate = PATH_POINTS[PATH_POINTS.length - 2];
        this.floater(gate.x - 20, gate.y - 28, `−${enemy.leak}`, "#e25b45");
        playHit("leak");
        if (this.lives <= 0) {
            this.lives = 0;
            this.finish("lost");
        }
    }
    finish(phase) {
        if (this.ended)
            return;
        this.phase = phase;
        this.paused = false;
        this.spawning = false;
        this.ended = true;
        this.placing = null;
        const score = this.score;
        const waveReached = phase === "won" ? WAVES.length : this.waveIndex + 1;
        const next = {
            bestWave: Math.max(this.best.bestWave, waveReached),
            bestKills: Math.max(this.best.bestKills, this.kills),
            bestScore: Math.max(this.best.bestScore, score),
        };
        this.best = next;
        writeSave(next);
        playUi(phase === "won" ? "win" : "lose");
    }
    kill(enemy) {
        enemy.alive = false;
        this.gold += enemy.gold;
        this.goldEarned += enemy.gold;
        this.kills += 1;
        this.floater(enemy.x, enemy.y - 18, `+${enemy.gold}`, "#e0a84a");
        this.spark(enemy.x, enemy.y, enemy.type === "tank" || enemy.type === "boss" ? "#e7d7b0" : "#d7c4a0", 10);
        playHit("kill");
    }
    hurt(enemy, raw, pen) {
        if (!enemy.alive)
            return;
        const amount = mitigatedDamage(raw, enemy.armor, pen);
        enemy.hp -= amount;
        enemy.flash = 0.09;
        if (enemy.hp <= 0)
            this.kill(enemy);
    }
    pickTarget(tower) {
        const def = TOWERS[tower.type];
        const max = def.range * def.range;
        const min = def.minRange * def.minRange;
        let best = null;
        let bestScore = 0;
        for (const enemy of this.enemies) {
            if (!enemy.alive)
                continue;
            const dx = enemy.x - tower.x;
            const dy = enemy.y - tower.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > max || d2 < min)
                continue;
            let score = 0;
            if (tower.mode === "first")
                score = enemy.traveled;
            else if (tower.mode === "last")
                score = -enemy.traveled;
            else if (tower.mode === "close")
                score = -d2;
            else
                score = enemy.hp;
            if (!best || score > bestScore) {
                best = enemy;
                bestScore = score;
            }
        }
        return best;
    }
    shoot(tower, target) {
        const def = TOWERS[tower.type];
        const damage = towerDamage(tower.type, tower.dmgRank);
        const ang = Math.atan2(target.y - tower.y, target.x - tower.x);
        tower.angle = ang;
        const tipX = tower.x + Math.cos(ang) * def.barrel;
        const tipY = tower.y + Math.sin(ang) * def.barrel;
        if (tower.type === "sniper") {
            this.hurt(target, damage, def.pen);
            this.beams.push({
                x1: tipX,
                y1: tipY,
                x2: target.x,
                y2: target.y,
                life: 0.12,
                max: 0.12,
            });
            this.spark(target.x, target.y, "#f3ecda", 6);
            this.shake = Math.min(1, this.shake + 0.08);
            playShot("sniper");
            return;
        }
        if (tower.type === "mortar") {
            const lead = this.lead(target, tower, 210);
            const dist = Math.hypot(lead.x - tipX, lead.y - tipY);
            this.bullets.push({
                kind: "shell",
                x: tipX,
                y: tipY,
                vx: 0,
                vy: 0,
                tx: lead.x,
                ty: lead.y,
                x0: tipX,
                y0: tipY,
                t: 0,
                dur: Math.min(0.95, 0.42 + dist / 520),
                damage,
                splash: def.splash,
                pen: def.pen,
                life: 2,
                targetId: target.id,
            });
            playShot("mortar");
            return;
        }
        const lead = this.lead(target, tower, def.bulletSpeed);
        const dx = lead.x - tipX;
        const dy = lead.y - tipY;
        const len = Math.hypot(dx, dy) || 1;
        this.bullets.push({
            kind: "mg",
            x: tipX,
            y: tipY,
            vx: (dx / len) * def.bulletSpeed,
            vy: (dy / len) * def.bulletSpeed,
            tx: lead.x,
            ty: lead.y,
            x0: tipX,
            y0: tipY,
            t: 0,
            dur: 0,
            damage,
            splash: 0,
            pen: def.pen,
            life: 1.1,
            targetId: target.id,
        });
        playShot("mg");
    }
    lead(enemy, tower, speed) {
        const wp = PATH_POINTS[enemy.wp];
        if (!wp)
            return { x: enemy.x, y: enemy.y };
        const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
        const t = speed > 0 ? dist / speed : 0.45;
        const ex = wp.x - enemy.x;
        const ey = wp.y - enemy.y;
        const el = Math.hypot(ex, ey) || 1;
        return {
            x: enemy.x + (ex / el) * enemy.speed * t,
            y: enemy.y + (ey / el) * enemy.speed * t,
        };
    }
    spark(x, y, color, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 20 + Math.random() * 90;
            this.particles.push({
                x,
                y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: 0.28 + Math.random() * 0.25,
                max: 0.5,
                r: 1.4 + Math.random() * 2.2,
                color,
                kind: "spark",
            });
        }
        if (this.particles.length > 240)
            this.particles.splice(0, this.particles.length - 240);
    }
    floater(x, y, text, color) {
        this.floaters.push({ x, y, text, life: 0.8, max: 0.8, color });
        if (this.floaters.length > 40)
            this.floaters.splice(0, this.floaters.length - 40);
    }
    boom(x, y, radius) {
        this.particles.push({
            x,
            y,
            vx: 0,
            vy: 0,
            life: 0.28,
            max: 0.28,
            r: radius,
            color: "#e0a84a",
            kind: "ring",
        });
        this.spark(x, y, "#e7c27a", 14);
        this.shake = Math.min(1, this.shake + 0.22);
        playHit("boom");
    }
    tick(dt) {
        if (this.noticeLife > 0) {
            this.noticeLife -= dt;
            if (this.noticeLife <= 0)
                this.notice = "";
        }
        if (this.phase !== "combat" || this.paused || this.ended)
            return;
        this.time += dt;
        this.shake = Math.max(0, this.shake - dt * 1.7);
        this.alarm = Math.max(0, this.alarm - dt * 1.4);
        this.spawnTick(dt);
        this.moveEnemies(dt);
        if (this.ended) {
            this.decayFx(dt);
            return;
        }
        this.towerTick(dt);
        this.bulletTick(dt);
        this.decayFx(dt);
        this.enemies = this.enemies.filter((e) => e.alive);
        this.bullets = this.bullets.filter((b) => b.life > 0 && (b.kind === "mg" || b.t < 1));
        this.beams = this.beams.filter((b) => b.life > 0);
        if (this.phase === "combat" && !this.spawning && this.enemies.length === 0) {
            const wave = WAVES[this.waveIndex];
            if (wave.bonus > 0) {
                this.gold += wave.bonus;
                this.goldEarned += wave.bonus;
                const mid = PATH_POINTS[Math.floor(PATH_POINTS.length / 2)];
                this.floater(mid.x, mid.y - 36, `Prämie +${wave.bonus}`, "#f3ecda");
            }
            if (this.waveIndex >= WAVES.length - 1)
                this.finish("won");
            else {
                this.waveIndex += 1;
                this.phase = "prep";
            }
        }
    }
    decayFx(dt) {
        for (const enemy of this.enemies) {
            if (enemy.flash > 0)
                enemy.flash = Math.max(0, enemy.flash - dt);
        }
        for (const p of this.particles)
            p.life -= dt;
        this.particles = this.particles.filter((p) => p.life > 0);
        for (const p of this.particles) {
            if (p.kind === "spark") {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 40 * dt;
            }
        }
        for (const f of this.floaters) {
            f.life -= dt;
            f.y -= 22 * dt;
        }
        this.floaters = this.floaters.filter((f) => f.life > 0);
        for (const b of this.beams)
            b.life -= dt;
    }
    spawnTick(dt) {
        if (!this.spawning)
            return;
        const wave = WAVES[this.waveIndex];
        if (!wave) {
            this.spawning = false;
            return;
        }
        if (this.groupIndex >= wave.groups.length) {
            this.spawning = false;
            return;
        }
        this.spawnTimer -= dt;
        if (this.spawnTimer > 0)
            return;
        const group = wave.groups[this.groupIndex];
        this.spawn(group.type);
        this.spawnedInGroup += 1;
        if (this.spawnedInGroup >= group.count) {
            this.groupIndex += 1;
            this.spawnedInGroup = 0;
            this.spawnTimer = 1.05;
        }
        else {
            this.spawnTimer = group.interval;
        }
    }
    moveEnemies(dt) {
        for (const enemy of this.enemies) {
            if (!enemy.alive)
                continue;
            const dest = PATH_POINTS[enemy.wp];
            if (!dest) {
                this.leak(enemy);
                continue;
            }
            const dx = dest.x - enemy.x;
            const dy = dest.y - enemy.y;
            const dist = Math.hypot(dx, dy);
            const step = enemy.speed * dt;
            if (dist <= step) {
                enemy.x = dest.x;
                enemy.y = dest.y;
                enemy.traveled += dist;
                enemy.wp += 1;
                if (enemy.wp >= PATH_POINTS.length)
                    this.leak(enemy);
            }
            else {
                enemy.x += (dx / dist) * step;
                enemy.y += (dy / dist) * step;
                enemy.traveled += step;
            }
        }
    }
    towerTick(dt) {
        for (const tower of this.towers) {
            if (tower.cool > 0)
                tower.cool -= dt;
            const target = this.pickTarget(tower);
            if (target) {
                const aim = Math.atan2(target.y - tower.y, target.x - tower.x);
                const k = 1 - Math.exp(-14 * dt);
                tower.angle = lerpAngle(tower.angle, aim, k);
            }
            if (target && tower.cool <= 0) {
                this.shoot(tower, target);
                tower.cool = towerInterval(tower.type, tower.rateRank);
            }
        }
    }
    bulletTick(dt) {
        for (const bullet of this.bullets) {
            bullet.life -= dt;
            if (bullet.kind === "shell") {
                bullet.t += dt / bullet.dur;
                const p = Math.min(1, bullet.t);
                bullet.x = bullet.x0 + (bullet.tx - bullet.x0) * p;
                bullet.y = bullet.y0 + (bullet.ty - bullet.y0) * p;
                if (bullet.t >= 1) {
                    bullet.life = 0;
                    this.boom(bullet.tx, bullet.ty, bullet.splash);
                    for (const enemy of this.enemies) {
                        if (!enemy.alive)
                            continue;
                        const d = Math.hypot(enemy.x - bullet.tx, enemy.y - bullet.ty);
                        if (d > bullet.splash)
                            continue;
                        const falloff = 1 - (d / bullet.splash) * 0.65;
                        this.hurt(enemy, bullet.damage * falloff, bullet.pen);
                    }
                }
                continue;
            }
            const target = this.enemies.find((e) => e.id === bullet.targetId && e.alive);
            if (target) {
                const dx = target.x - bullet.x;
                const dy = target.y - bullet.y;
                const len = Math.hypot(dx, dy) || 1;
                const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
                bullet.vx = bullet.vx * 0.72 + (dx / len) * speed * 0.28;
                bullet.vy = bullet.vy * 0.72 + (dy / len) * speed * 0.28;
                if (len < target.radius + 6) {
                    this.hurt(target, bullet.damage, bullet.pen);
                    bullet.life = 0;
                    continue;
                }
            }
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
            if (!target) {
                for (const enemy of this.enemies) {
                    if (!enemy.alive)
                        continue;
                    if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + 5) {
                        this.hurt(enemy, bullet.damage, bullet.pen);
                        bullet.life = 0;
                        break;
                    }
                }
            }
        }
    }
    infoFor(type, tower, gold) {
        const def = TOWERS[type];
        const dmgRank = tower?.dmgRank ?? 0;
        const rateRank = tower?.rateRank ?? 0;
        const dmgCost = dmgRank >= MAX_RANK ? 0 : upgradeCost(type, "damage", dmgRank);
        const rateCost = rateRank >= MAX_RANK ? 0 : upgradeCost(type, "rate", rateRank);
        return {
            id: tower?.id ?? null,
            type,
            name: def.name,
            blurb: def.blurb,
            dmgRank,
            rateRank,
            damage: Math.round(towerDamage(type, dmgRank)),
            interval: towerInterval(type, rateRank),
            range: def.range,
            minRange: def.minRange,
            splash: def.splash,
            mode: tower?.mode ?? "first",
            sell: tower ? Math.floor(tower.invested * SELL_RATE) : 0,
            dmgCost,
            rateCost,
            canDmg: Boolean(tower) && dmgRank < MAX_RANK && gold >= dmgCost,
            canRate: Boolean(tower) && rateRank < MAX_RANK && gold >= rateCost,
        };
    }
    hud() {
        const selected = this.selectedTower();
        const alive = this.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
        const wave = WAVES[this.waveIndex];
        let queued = 0;
        if (this.phase === "combat" && wave) {
            for (let i = this.groupIndex; i < wave.groups.length; i++) {
                const g = wave.groups[i];
                queued += i === this.groupIndex ? g.count - this.spawnedInGroup : g.count;
            }
        }
        return {
            phase: this.phase,
            gold: this.gold,
            lives: this.lives,
            wave: this.waveIndex + 1,
            waves: WAVES.length,
            kills: this.kills,
            goldEarned: this.goldEarned,
            leaks: this.leaks,
            remaining: alive + Math.max(0, queued),
            waveText: waveLabel(this.waveIndex),
            nextText: this.phase === "prep" ? waveLabel(this.waveIndex) : "",
            bonus: wave?.bonus ?? 0,
            paused: this.paused,
            speed: this.speed,
            placing: this.placing,
            selectedId: this.selectedId,
            selected: selected ? this.infoFor(selected.type, selected, this.gold) : null,
            placingInfo: this.placing ? this.infoFor(this.placing, null, this.gold) : null,
            notice: this.notice,
            score: this.score,
        };
    }
    get bestSave() {
        return this.best;
    }
}
export function pointerCell(x, y) {
    return cellAt(x, y);
}
export { CELL };
