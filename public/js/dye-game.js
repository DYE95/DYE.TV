var Dye = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/dye-entry.ts
  var dye_entry_exports = {};
  __export(dye_entry_exports, {
    BASE_SPEED: () => BASE_SPEED,
    Engine: () => Engine,
    SHAPES: () => SHAPES,
    SWATCHES: () => SWATCHES,
    WORLD_H: () => WORLD_H,
    WORLD_W: () => WORLD_W,
    blankToken: () => blankToken,
    defaultTokens: () => defaultTokens,
    drawFrame: () => drawFrame,
    drawGlyph: () => drawGlyph,
    formatDec: () => formatDec,
    formatInt: () => formatInt,
    paintShape: () => paintShape,
    sanitizeToken: () => sanitizeToken,
    sanitizeTokens: () => sanitizeTokens,
    sfx: () => sfx,
    swatchHex: () => swatchHex
  });

  // src/game/audio.ts
  var Sfx = class {
    ctx = null;
    master = null;
    muted = false;
     unlock() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!this.ctx) {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }
    jump() {
      this.tone(220, 0.09, "sine", 0.18, 180);
    }
    land() {
      this.noise(0.08, 0.12);
      this.tone(90, 0.07, "triangle", 0.08, -30);
    }
    slide() {
      this.noise(0.12, 0.08);
    }
    pickup() {
      this.tone(520, 0.07, "sine", 0.12, 80);
      this.tone(760, 0.09, "sine", 0.08, 40);
    }
    clear(combo) {
      const f = 360 + Math.min(18, combo) * 28;
      this.tone(f, 0.06, "triangle", 0.07, 40);
    }
    ramp() {
      this.tone(180, 0.16, "sawtooth", 0.05, 140);
    }
    crash() {
      this.noise(0.22, 0.22);
      this.tone(70, 0.28, "sine", 0.16, -40);
    }
    tone(freq, dur, type, gain, slide) {
      if (this.muted || !this.ctx || !this.master) return;
      try {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const wobble = 0.96 + Math.random() * 0.08;
        o.type = type;
        o.frequency.setValueAtTime(freq * wobble, t);
        const dest = Math.max(48, (freq + slide) * wobble);
        o.frequency.exponentialRampToValueAtTime(dest, t + dur);
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(1e-3, t + dur);
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + dur + 0.02);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
        };
      } catch {
      }
    }
    noise(dur, gain) {
      if (this.muted || !this.ctx || !this.master) return;
      try {
        const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
        const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 840;
        const g = this.ctx.createGain();
        g.gain.value = gain;
        src.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        src.start();
        src.onended = () => {
          src.disconnect();
          filter.disconnect();
          g.disconnect();
        };
      } catch {
      }
    }
  };
  var sfx = new Sfx();

  // src/game/constants.ts
  var WORLD_W = 960;
  var WORLD_H = 540;
  var GROUND_Y = 452;
  var PLAYER_X = 178;
  var BASE_SPEED = 270;
  var MAX_SPEED = 620;
  var SPEED_GAIN = 0.022;
  var JUMP_V = -880;
  var GRAVITY = 2350;
  var APEX_T = 880 / 2350;
  var OBS_GAP = 0.98;
  var GAP_EXTRA = 1.22;
  var DENSITY_DISTANCE = 15e3;
  var SKY_TOP = "#101418";
  var SKY_BOTTOM = "#1a2127";
  var INK = "#0c0e10";
  var MIST = "#eceeef";

  // src/game/geom.ts
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function verticalGap(a, b) {
    if (a.y + a.h < b.y) return b.y - (a.y + a.h);
    if (b.y + b.h < a.y) return a.y - (b.y + b.h);
    return 0;
  }
  function inset(r, px, py) {
    return {
      x: r.x + px,
      y: r.y + py,
      w: Math.max(4, r.w - px * 2),
      h: Math.max(4, r.h - py * 2)
    };
  }
  function obstacleBounds(o, distance, overheadGap) {
    const x = o.worldX - distance;
    if (o.kind === "obstacle" && o.dodge === "slide") {
      const bottom = GROUND_Y - overheadGap;
      return { x, y: bottom - o.h, w: o.w, h: o.h };
    }
    if (o.kind === "ramp") return { x, y: GROUND_Y - 22, w: o.w, h: 22 };
    return { x, y: GROUND_Y - o.h, w: o.w, h: o.h };
  }
  function playerBounds(feet, standH, slideH, playerW, sliding) {
    const h = sliding ? slideH : standH;
    return { x: PLAYER_X, y: feet - h, w: playerW, h };
  }
  function mix(hex, toward, t) {
    const a = rgb(hex);
    const b = rgb(toward);
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }
  function rgb(hex) {
    const h = hex.replace("#", "");
    if (h.length !== 6) return [142, 153, 164];
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16)
    ];
  }
  function deactivateOffscreen(list, distance) {
    for (const o of list) {
      if (o.active && o.worldX + o.w < distance - 160) o.active = false;
    }
  }

  // src/game/tokens.ts
  var SWATCHES = [
    { id: "steel", label: "Stahl", hex: "#8e99a4" },
    { id: "graphite", label: "Graphit", hex: "#5e6b76" },
    { id: "mist", label: "Nebel", hex: "#c5ced4" },
    { id: "signal", label: "Signal", hex: "#7f9eae" },
    { id: "pipe", label: "Rohr", hex: "#4d6270" },
    { id: "oxide", label: "Oxid", hex: "#9a8478" }
  ];
  var SHAPES = [
    { id: "operator", label: "Anlagenfahrer", kind: "player", dodge: "jump" },
    { id: "valve", label: "Absperrventil", kind: "obstacle", dodge: "jump" },
    { id: "elbow", label: "Rohrknie", kind: "obstacle", dodge: "jump" },
    { id: "pump", label: "Kreiselpumpe", kind: "obstacle", dodge: "jump" },
    { id: "flange", label: "Flanschpaket", kind: "obstacle", dodge: "jump" },
    { id: "reactor", label: "R\xFChrbeh\xE4lter", kind: "obstacle", dodge: "jump" },
    { id: "steam", label: "Dampfleitung", kind: "obstacle", dodge: "slide" },
    { id: "exchanger", label: "Rohrb\xFCndel", kind: "obstacle", dodge: "slide" },
    { id: "tray", label: "Kabelpritsche", kind: "obstacle", dodge: "slide" },
    { id: "ramp", label: "Rampe", kind: "ramp", dodge: "jump" },
    { id: "vial", label: "Probe", kind: "pickup", dodge: "jump" },
    { id: "pellet", label: "Katalysator", kind: "pickup", dodge: "jump" }
  ];
  var HEX = Object.fromEntries(SWATCHES.map((s) => [s.id, s.hex]));
  function swatchHex(id) {
    return HEX[id] ?? HEX.steel;
  }
  function tok(partial) {
    return partial;
  }
  function defaultTokens() {
    return [
      tok({
        id: "player",
        name: "Anlagenfahrer",
        kind: "player",
        shape: "operator",
        dodge: "jump",
        width: 34,
        height: 68,
        points: 0,
        weight: 1,
        enabled: true,
        fill: "signal",
        trim: "mist",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "valve",
        name: "Absperrventil",
        kind: "obstacle",
        shape: "valve",
        dodge: "jump",
        width: 58,
        height: 52,
        points: 20,
        weight: 5,
        enabled: true,
        fill: "steel",
        trim: "mist",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "elbow",
        name: "Rohrknie",
        kind: "obstacle",
        shape: "elbow",
        dodge: "jump",
        width: 66,
        height: 58,
        points: 20,
        weight: 4,
        enabled: true,
        fill: "pipe",
        trim: "steel",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "pump",
        name: "Kreiselpumpe",
        kind: "obstacle",
        shape: "pump",
        dodge: "jump",
        width: 80,
        height: 60,
        points: 30,
        weight: 3,
        enabled: true,
        fill: "graphite",
        trim: "signal",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "flange",
        name: "Flanschpaket",
        kind: "obstacle",
        shape: "flange",
        dodge: "jump",
        width: 50,
        height: 46,
        points: 15,
        weight: 4,
        enabled: true,
        fill: "mist",
        trim: "graphite",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "reactor",
        name: "R\xFChrbeh\xE4lter",
        kind: "obstacle",
        shape: "reactor",
        dodge: "jump",
        width: 86,
        height: 64,
        points: 40,
        weight: 2,
        enabled: true,
        fill: "oxide",
        trim: "steel",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "steam",
        name: "Dampfleitung",
        kind: "obstacle",
        shape: "steam",
        dodge: "slide",
        width: 108,
        height: 58,
        points: 25,
        weight: 4,
        enabled: true,
        fill: "steel",
        trim: "mist",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "exchanger",
        name: "Rohrb\xFCndel",
        kind: "obstacle",
        shape: "exchanger",
        dodge: "slide",
        width: 112,
        height: 64,
        points: 35,
        weight: 3,
        enabled: true,
        fill: "pipe",
        trim: "signal",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "tray",
        name: "Kabelpritsche",
        kind: "obstacle",
        shape: "tray",
        dodge: "slide",
        width: 96,
        height: 44,
        points: 20,
        weight: 3,
        enabled: true,
        fill: "graphite",
        trim: "mist",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "belt",
        name: "F\xF6rderband",
        kind: "ramp",
        shape: "ramp",
        dodge: "jump",
        width: 210,
        height: 22,
        points: 10,
        weight: 2,
        enabled: true,
        fill: "signal",
        trim: "steel",
        boost: 1.32,
        boostMs: 2200
      }),
      tok({
        id: "surge",
        name: "Pumpensto\xDF",
        kind: "ramp",
        shape: "ramp",
        dodge: "jump",
        width: 160,
        height: 22,
        points: 15,
        weight: 1,
        enabled: true,
        fill: "oxide",
        trim: "mist",
        boost: 1.62,
        boostMs: 1300
      }),
      tok({
        id: "vial",
        name: "Probe",
        kind: "pickup",
        shape: "vial",
        dodge: "jump",
        width: 28,
        height: 36,
        points: 25,
        weight: 3,
        enabled: true,
        fill: "signal",
        trim: "mist",
        boost: 1,
        boostMs: 0
      }),
      tok({
        id: "pellet",
        name: "Katalysator",
        kind: "pickup",
        shape: "pellet",
        dodge: "jump",
        width: 34,
        height: 30,
        points: 50,
        weight: 1,
        enabled: true,
        fill: "oxide",
        trim: "steel",
        boost: 1,
        boostMs: 0
      })
    ];
  }
  var LIMITS = {
    player: { w: [26, 52], h: [52, 96] },
    obstacle: { w: [40, 112], h: [32, 78] },
    ramp: { w: [140, 300], h: [22, 22] },
    pickup: { w: [22, 44], h: [22, 44] }
  };
  function limitsFor(token) {
    if (token.kind === "obstacle" && token.dodge === "jump") {
      return { w: [40, 92], h: [32, 68] };
    }
    if (token.kind === "obstacle") {
      return { w: [64, 112], h: [36, 78] };
    }
    return LIMITS[token.kind];
  }
  function sanitizeToken(input) {
    if (!input || typeof input !== "object") return null;
    const shape = SHAPES.find((s) => s.id === input.shape);
    if (!shape) return null;
    const kind = shape.kind;
    const dodge = kind === "obstacle" ? input.dodge === "slide" ? "slide" : "jump" : shape.dodge;
    const lim = limitsFor({ kind, dodge });
    const fill = SWATCHES.some((s) => s.id === input.fill) ? input.fill : "steel";
    const trim = SWATCHES.some((s) => s.id === input.trim) ? input.trim : "mist";
    const id = typeof input.id === "string" && input.id.trim() ? input.id : cryptoId();
    const name = typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 40) : shape.label;
    return {
      id,
      name,
      kind,
      shape: shape.id,
      dodge,
      width: clamp(num(input.width, lim.w[0]), lim.w[0], lim.w[1]),
      height: clamp(num(input.height, lim.h[0]), lim.h[0], lim.h[1]),
      points: clamp(Math.round(num(input.points, 10)), 0, 200),
      weight: clamp(Math.round(num(input.weight, 3)), 1, 8),
      enabled: input.enabled !== false,
      fill,
      trim,
      boost: clamp(num(input.boost, 1.3), 1.1, 2),
      boostMs: clamp(Math.round(num(input.boostMs, 1600)), 600, 4e3)
    };
  }
  function sanitizeTokens(list) {
    const raw = Array.isArray(list) ? list : [];
    const clean = raw.map((item) => sanitizeToken(item)).filter((t) => t !== null);
    const players = clean.filter((t) => t.kind === "player");
    const rest = clean.filter((t) => t.kind !== "player");
    const player = players[0] ?? defaultTokens()[0];
    return [player, ...rest];
  }
  function blankToken(kind) {
    const base = kind === "ramp" ? defaultTokens().find((t) => t.id === "belt") : kind === "pickup" ? defaultTokens().find((t) => t.id === "vial") : defaultTokens().find((t) => t.id === "valve");
    const token = sanitizeToken({ ...base, id: cryptoId(), name: defaultName(kind) });
    return token ?? defaultTokens()[1];
  }
  function defaultName(kind) {
    if (kind === "ramp") return "Neue Rampe";
    if (kind === "pickup") return "Neues Sammelst\xFCck";
    return "Neues Hindernis";
  }
  function num(v, fallback) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function cryptoId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `tok-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // src/game/engine.ts
  function xHit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x;
  }
  function emptyObs() {
    return {
      active: false,
      worldX: 0,
      w: 40,
      h: 40,
      kind: "obstacle",
      dodge: "jump",
      shape: "valve",
      fill: "#8e99a4",
      trim: "#c5ced4",
      name: "",
      points: 0,
      boost: 1,
      boostMs: 0,
      scored: false,
      near: false,
      hit: false,
      serial: 0
    };
  }
  function emptyParticle() {
    return { life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, size: 2, color: "#eceeef", gravity: 900 };
  }
  function emptyFloater() {
    return { life: 0, max: 1, x: 0, y: 0, text: "" };
  }
  var Engine = class {
    phase = "ready";
    tokens = [];
    mode = "eintipp";
    runMode = "eintipp";
    idle = false;
    paused = false;
    shakeOn = true;
    reduced = false;
    highscore = 0;
    distance = 0;
    scenery = 0;
    bonus = 0;
    combo = 0;
    peakCombo = 0;
    feet = GROUND_Y;
    vy = 0;
    grounded = true;
    jumpBuffer = 0;
    slideBuffer = 0;
    slideT = 0;
    runPhase = 0;
    squash = 1;
    landT = 0;
    jumpT = 0;
    crashT = 0;
    hitstop = 0;
    trauma = 0;
    flash = 0;
    rampMul = 1;
    rampT = 0;
    tainted = false;
    nextX = PLAYER_X + 820;
    actionDistance = -1e9;
    actionDodge = null;
    time = 0;
    announced = false;
    last = null;
    idleMark = -1;
    struck = null;
    spawnId = 1;
    obstacles = Array.from({ length: 28 }, emptyObs);
    particles = Array.from({ length: 72 }, emptyParticle);
    floaters = Array.from({ length: 10 }, emptyFloater);
    playerToken() {
      return this.tokens.find((t) => t.kind === "player");
    }
    standH() {
      return clamp(this.playerToken()?.height ?? 68, 52, 96);
    }
    playerW() {
      return clamp(this.playerToken()?.width ?? 34, 26, 52);
    }
    slideH() {
      return clamp(this.standH() * 0.42, 22, 34);
    }
    overheadGap() {
      return this.slideH() + 10;
    }
    speed() {
      const extra = Math.min(MAX_SPEED - BASE_SPEED, this.distance * SPEED_GAIN);
      return (BASE_SPEED + extra) * this.rampMul;
    }
    score() {
      return Math.floor(this.distance / 12) + this.bonus;
    }
    meters() {
      return Math.floor(this.distance / 46);
    }
    playable() {
      return this.tokens.some((t) => t.kind === "obstacle" && t.enabled && t.weight > 0);
    }
    hud() {
      const threat = this.phase === "play" ? this.nextThreat() : null;
      const score = this.score();
      return {
        phase: this.phase,
        score,
        meters: this.meters(),
        combo: this.combo,
        peakCombo: this.peakCombo,
        speed: this.phase === "play" || this.phase === "crash" ? this.speed() : BASE_SPEED,
        ramp: this.rampMul,
        hint: threat ? `${threat.dodge === "jump" ? "Springen" : "Rutschen"} \xB7 ${threat.name}` : "Bahn frei",
        hintDodge: threat?.dodge ?? null,
        tainted: this.tainted,
        beating: !this.tainted && score > this.highscore && score > 0,
        blocked: !this.playable(),
        paused: this.paused,
        last: this.last
      };
    }
    drawState() {
      const player = this.playerToken();
      return {
        phase: this.phase,
        distance: this.distance,
        scenery: this.scenery,
        feet: this.feet,
        vy: this.vy,
        grounded: this.grounded,
        slideT: this.slideT,
        runPhase: this.runPhase,
        squash: this.squash,
        crashT: this.crashT,
        trauma: this.trauma,
        flash: this.flash,
        shakeOn: this.shakeOn,
        reduced: this.reduced,
        rampMul: this.rampMul,
        speed: this.phase === "ready" ? 0 : this.speed(),
        standH: this.standH(),
        playerW: this.playerW(),
        slideH: this.slideH(),
        overheadGap: this.overheadGap(),
        suit: swatchHex(player?.fill ?? "signal"),
        helmet: swatchHex(player?.trim ?? "mist"),
        obstacles: this.obstacles,
        particles: this.particles,
        floaters: this.floaters,
        time: this.time
      };
    }
    primary() {
      if (this.paused) return;
      if (this.phase === "ready" || this.phase === "over") {
        this.start();
        return;
      }
      if (this.phase !== "play") return;
      if (this.runMode === "eintipp") this.smart();
      else this.requestJump();
    }
    secondary() {
      if (this.paused || this.phase !== "play") return;
      if (this.runMode === "eintipp") this.smart();
      else this.requestSlide();
    }
    start() {
      if (!this.playable()) return;
      this.phase = "play";
      this.runMode = this.mode;
      this.distance = 0;
      this.bonus = 0;
      this.combo = 0;
      this.peakCombo = 0;
      this.feet = GROUND_Y;
      this.vy = 0;
      this.grounded = true;
      this.jumpBuffer = 0;
      this.slideBuffer = 0;
      this.slideT = 0;
      this.crashT = 0;
      this.hitstop = 0;
      this.trauma = 0;
      this.flash = 0;
      this.rampMul = 1;
      this.rampT = 0;
      this.tainted = this.idle;
      this.nextX = PLAYER_X + 860;
      this.actionDodge = null;
      this.actionDistance = -1e9;
      this.announced = false;
      this.last = null;
      this.idleMark = -1;
      this.struck = null;
      for (const o of this.obstacles) o.active = false;
      for (const f of this.floaters) f.life = 0;
    }
    step(dt) {
      this.time += dt;
      if (this.paused) return;
      if (this.hitstop > 0) {
        this.hitstop = Math.max(0, this.hitstop - dt);
        this.flash = Math.max(0, this.flash - dt * 1.6);
        this.decayTrauma(dt * 0.35);
        return;
      }
      if (this.phase === "ready") {
        this.scenery += dt * 46;
        this.runPhase += dt * 8;
        this.anim(dt);
        this.simParticles(dt, 40);
        return;
      }
      if (this.phase === "over") {
        this.anim(dt);
        this.simParticles(dt, 0);
        return;
      }
      if (this.phase === "crash") {
        this.crashT += dt;
        this.anim(dt);
        this.simParticles(dt, 0);
        if (this.crashT > 0.58) this.finish();
        return;
      }
      if (this.idle) this.tainted = true;
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      this.slideBuffer = Math.max(0, this.slideBuffer - dt);
      if (this.rampT > 0) this.rampT = Math.max(0, this.rampT - dt);
      else this.rampMul += (1 - this.rampMul) * (1 - Math.exp(-2.4 * dt));
      if (this.idle) this.auto();
      this.tryJump();
      this.trySlide();
      const speed = this.speed();
      const steps = Math.max(1, Math.ceil(speed * dt / 10));
      const sub = dt / steps;
      for (let i = 0; i < steps; i++) {
        this.distance += speed * sub;
        this.physics(sub);
        this.slideT = Math.max(0, this.slideT - sub);
        this.collide();
        if (this.phase !== "play") break;
      }
      if (this.phase === "play") {
        this.spawn();
        this.resolveClears();
        deactivateOffscreen(this.obstacles, this.distance);
        const moving = this.grounded && this.slideT <= 0;
        this.runPhase += dt * (moving ? 10 + speed / 90 : 0);
      }
      this.anim(dt);
      this.simParticles(dt, speed);
    }
    physics(sub) {
      if (!this.grounded) {
        this.vy += GRAVITY * sub;
        this.feet += this.vy * sub;
        if (this.feet >= GROUND_Y) {
          this.feet = GROUND_Y;
          this.vy = 0;
          if (!this.grounded) {
            this.grounded = true;
            this.landT = 0.16;
            this.slideT = 0;
            sfx.land();
            this.burst(PLAYER_X + this.playerW() * 0.5, GROUND_Y, 7, "#8e99a4", 700);
            this.addTrauma(0.08);
          }
        }
      }
    }
    collide() {
      const sliding = this.slideT > 0 && this.grounded;
      const body = inset(playerBounds(this.feet, this.standH(), this.slideH(), this.playerW(), sliding), 3, 2);
      for (const o of this.obstacles) {
        if (!o.active || o.hit) continue;
        const rect = obstacleBounds(o, this.distance, this.overheadGap());
        if (rect.x > body.x + body.w + 24 || rect.x + rect.w < body.x - 24) continue;
        const box = o.kind === "obstacle" ? inset(rect, 3, 2) : rect;
        const hit = overlap(body, box);
        if (o.kind === "ramp") {
          if (hit && !o.scored) {
            o.scored = true;
            this.rampMul = Math.max(this.rampMul, o.boost);
            this.rampT = Math.max(this.rampT, o.boostMs / 1e3);
            this.floater("Tempo", rect.x + rect.w * 0.5, rect.y - 12);
            this.burst(rect.x + 20, GROUND_Y, 6, "#7f9eae", 200);
            sfx.ramp();
          }
          continue;
        }
        if (o.kind === "pickup") {
          if (hit && !o.scored) {
            o.scored = true;
            const gain = Math.round(o.points * (1 + this.combo * 0.25));
            this.bonus += gain;
            this.floater(`+${gain}`, rect.x + rect.w * 0.5, rect.y - 8);
            this.burst(rect.x + rect.w * 0.5, rect.y, 8, o.fill, 500);
            sfx.pickup();
          }
          continue;
        }
        if (hit) {
          this.die(o);
          return;
        }
        if (xHit(body, rect)) {
          const gap = verticalGap(body, rect);
          if (gap > 0 && gap < 8) o.near = true;
        }
      }
    }
    die(o) {
      this.phase = "crash";
      this.crashT = 0;
      this.hitstop = this.reduced ? 0.04 : 0.09;
      this.flash = 1;
      o.hit = true;
      this.struck = o;
      this.addTrauma(0.78);
      this.burst(PLAYER_X + this.playerW(), this.feet - 20, 16, "#eceeef", 1100);
      this.burst(PLAYER_X + 10, GROUND_Y, 8, o.fill, 800);
      sfx.crash();
    }
    finish() {
      if (this.announced) return;
      this.announced = true;
      this.phase = "over";
      const score = this.score();
      this.last = {
        score,
        meters: this.meters(),
        combo: this.peakCombo,
        tainted: this.tainted,
        isRecord: !this.tainted && score > this.highscore && score > 0
      };
    }
    spawn() {
      const speed = Math.max(80, this.speed());
      const horizon = this.distance + PLAYER_X + speed * 1.35 + 200;
      const minLead = this.distance + PLAYER_X + speed * 1.05;
      let guard = 0;
      while (this.nextX < horizon && guard++ < 5) {
        const token = this.roll();
        if (!token) {
          this.nextX += 360;
          continue;
        }
        if (this.nextX < minLead) this.nextX = minLead;
        const slot = this.obstacles.find((o) => !o.active);
        const w = token.width;
        const h = token.kind === "ramp" ? 22 : token.height;
        if (slot) {
          slot.active = true;
          slot.worldX = this.nextX;
          slot.w = w;
          slot.h = h;
          slot.kind = token.kind;
          slot.dodge = token.dodge;
          slot.shape = token.shape;
          slot.fill = swatchHex(token.fill);
          slot.trim = swatchHex(token.trim);
          slot.name = token.name;
          slot.points = token.points;
          slot.boost = token.boost;
          slot.boostMs = token.boostMs;
          slot.scored = false;
          slot.near = false;
          slot.hit = false;
          slot.serial = this.spawnId++;
        }
        const density = clamp(this.distance / DENSITY_DISTANCE, 0, 1);
        const extra = (1 - density) * GAP_EXTRA;
        const base = token.kind === "obstacle" ? OBS_GAP : 0.42;
        this.nextX += w + speed * (base + extra);
      }
    }
    roll() {
      const r = Math.random();
      let kind = "obstacle";
      if (r < 0.12) kind = "ramp";
      else if (r < 0.24) kind = "pickup";
      return this.weighted(kind) ?? (kind === "obstacle" ? null : this.weighted("obstacle"));
    }
    weighted(kind) {
      const list = this.tokens.filter((t) => t.kind === kind && t.enabled && t.weight > 0);
      if (!list.length) return null;
      let total = 0;
      for (const t of list) total += t.weight;
      let ticket = Math.random() * total;
      for (const t of list) {
        ticket -= t.weight;
        if (ticket <= 0) return t;
      }
      return list[list.length - 1] ?? null;
    }
    resolveClears() {
      const left = this.distance + PLAYER_X;
      for (const o of this.obstacles) {
        if (!o.active || o.kind !== "obstacle" || o.scored || o.hit) continue;
        if (o.worldX + o.w >= left) continue;
        o.scored = true;
        this.combo += 1;
        if (o.near) this.combo += 1;
        this.peakCombo = Math.max(this.peakCombo, this.combo);
        const perfect = this.isPerfect(o);
        const mult = 1 + (this.combo - 1) * 0.35;
        const gain = Math.round(o.points * mult * (perfect ? 1.5 : 1));
        this.bonus += gain;
        const label = o.near ? "Knapp" : perfect ? "Perfekt" : "";
        this.floater(label ? `${label} +${gain}` : `+${gain}`, PLAYER_X + 70, this.feet - this.standH() - 18);
        sfx.clear(this.combo);
        if (perfect || o.near) this.addTrauma(0.12);
      }
      for (const o of this.obstacles) {
        if (!o.active || o.scored || o.kind === "obstacle") continue;
        if (o.worldX + o.w < left) o.scored = true;
      }
    }
    isPerfect(o) {
      if (this.actionDodge !== o.dodge) return false;
      const frontThen = o.worldX - (this.actionDistance + PLAYER_X + this.playerW());
      const speed = Math.max(200, this.speed());
      return frontThen > speed * 0.08 && frontThen < speed * 0.42;
    }
    nextThreat() {
      const left = this.distance + PLAYER_X;
      let best = null;
      for (const o of this.obstacles) {
        if (!o.active || o.kind !== "obstacle" || o.scored || o.hit) continue;
        if (o.worldX + o.w < left) continue;
        if (!best || o.worldX < best.worldX) best = o;
      }
      return best;
    }
    auto() {
      const o = this.nextThreat();
      if (!o) return;
      const speed = Math.max(80, this.speed());
      const tti = (o.worldX - (this.distance + PLAYER_X + this.playerW())) / speed;
      const pass = o.w / speed;
      if (o.dodge === "slide") {
        const lead2 = clamp(0.16 + pass * 0.12, 0.14, 0.32);
        if (this.idleMark !== o.serial && tti <= lead2 && this.grounded && this.slideT <= 0) {
          if (this.requestSlide(o)) this.idleMark = o.serial;
        }
        return;
      }
      const lead = clamp(APEX_T - pass * 0.5, 0.12, 0.42);
      if (this.idleMark !== o.serial && tti <= lead && this.grounded) {
        const before = this.grounded;
        this.requestJump();
        if (before && !this.grounded) this.idleMark = o.serial;
      }
    }
    smart() {
      const n = this.nextThreat();
      if (n?.dodge === "slide") this.requestSlide(n);
      else this.requestJump();
    }
    requestJump() {
      this.jumpBuffer = 0.14;
      this.tryJump();
    }
    requestSlide(target) {
      this.slideBuffer = 0.14;
      return this.trySlide(target);
    }
    tryJump() {
      if (this.jumpBuffer <= 0 || !this.grounded) return;
      this.jumpBuffer = 0;
      this.slideT = 0;
      this.vy = JUMP_V;
      this.grounded = false;
      this.jumpT = 0.16;
      this.noteAction("jump");
      sfx.jump();
    }
    trySlide(target) {
      if (this.slideBuffer <= 0 || !this.grounded || this.slideT > 0) return false;
      this.slideBuffer = 0;
      const threat = target ?? this.nextThreat();
      const speed = Math.max(80, this.speed());
      let dur = 0.6;
      if (threat && threat.dodge === "slide") dur = clamp(threat.w / speed + 0.3, 0.6, 0.9);
      this.slideT = dur;
      this.noteAction("slide");
      sfx.slide();
      this.burst(PLAYER_X, GROUND_Y, 5, "#c5ced4", 400);
      return true;
    }
    noteAction(dodge) {
      const n = this.nextThreat();
      const speed = Math.max(80, this.speed());
      if (n && n.dodge !== dodge) {
        const dist = n.worldX - (this.distance + PLAYER_X);
        if (dist < speed * 0.85) this.combo = 0;
      }
      this.actionDistance = this.distance;
      this.actionDodge = dodge;
    }
    anim(dt) {
      this.jumpT = Math.max(0, this.jumpT - dt);
      this.landT = Math.max(0, this.landT - dt);
      this.flash = Math.max(0, this.flash - dt * 1.8);
      this.decayTrauma(dt);
      let target = 1;
      if (!this.reduced) {
        if (this.jumpT > 0) target = 1.16;
        else if (this.landT > 0.02) target = 0.78;
        else if (!this.grounded) target = 1.06;
      }
      this.squash += (target - this.squash) * (1 - Math.exp(-14 * dt));
      for (const f of this.floaters) {
        if (f.life <= 0) continue;
        f.life -= dt;
        f.y -= 36 * dt;
      }
    }
    simParticles(dt, speed) {
      for (const p of this.particles) {
        if (p.life <= 0) continue;
        p.life -= dt;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt - speed * dt;
        p.y += p.vy * dt;
      }
      if ((this.phase === "play" || this.phase === "ready") && Math.random() < dt * 5) {
        this.burst(Math.random() * 960, GROUND_Y - 180 - Math.random() * 80, 1, "rgba(197,206,212,0.8)", -30);
      }
    }
    decayTrauma(dt) {
      this.trauma = Math.max(0, this.trauma - dt * 1.7);
    }
    addTrauma(v) {
      if (!this.shakeOn || this.reduced) return;
      this.trauma = Math.min(1, this.trauma + v);
    }
    burst(x, y, n, color, gravity) {
      if (this.reduced && n > 4) n = 4;
      let left = n;
      for (const p of this.particles) {
        if (p.life > 0) continue;
        p.life = p.max = 0.28 + Math.random() * 0.4;
        p.x = x;
        p.y = y;
        p.vx = (Math.random() - 0.5) * 220;
        p.vy = -40 - Math.random() * 180;
        p.size = 2 + Math.random() * 3;
        p.color = color;
        p.gravity = gravity;
        if (--left <= 0) break;
      }
    }
    floater(text, x, y) {
      const slot = this.floaters.find((f) => f.life <= 0) ?? this.floaters[0];
      slot.life = slot.max = 0.7;
      slot.x = x;
      slot.y = y;
      slot.text = text;
    }
  };

  // src/game/render.ts
  var TOWERS = [
    { x: 20, w: 34, h: 190 },
    { x: 70, w: 16, h: 250 },
    { x: 104, w: 48, h: 150 },
    { x: 190, w: 26, h: 220 },
    { x: 240, w: 72, h: 130 },
    { x: 350, w: 18, h: 270 },
    { x: 392, w: 40, h: 170 },
    { x: 470, w: 86, h: 112 },
    { x: 590, w: 22, h: 230 },
    { x: 640, w: 44, h: 160 },
    { x: 730, w: 14, h: 200 },
    { x: 770, w: 58, h: 142 }
  ];
  function drawFrame(ctx, cssW, cssH, dpr, sim) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, cssW, cssH);
    if (cssW < 8 || cssH < 8) return;
    const scale = Math.min(cssW / WORLD_W, cssH / WORLD_H);
    const ox = (cssW - WORLD_W * scale) / 2;
    const oy = (cssH - WORLD_H * scale) / 2;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    const shake = sim.shakeOn && !sim.reduced ? sim.trauma * sim.trauma : 0;
    const sx = Math.sin(sim.time * 47) * 12 * shake;
    const sy = Math.cos(sim.time * 35) * 8 * shake;
    ctx.translate(sx, sy);
    paintWorld(ctx, sim);
    ctx.restore();
  }
  function paintWorld(ctx, sim) {
    const scroll = sim.phase === "ready" ? sim.scenery : sim.distance;
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, SKY_TOP);
    sky.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = sky;
    ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);
    paintTowers(ctx, scroll * 0.16);
    paintRack(ctx, scroll * 0.42);
    paintGround(ctx, scroll);
    for (const o of sim.obstacles) {
      if (!o.active) continue;
      const b = obstacleBounds(o, sim.distance, sim.overheadGap);
      if (b.x > WORLD_W + 40 || b.x + b.w < -80) continue;
      paintShape(ctx, o.shape, b.x, b.y, b.w, b.h, o.fill, o.trim, o.hit ? sim.flash : 0);
    }
    paintParticles(ctx, sim.particles);
    paintPlayer(ctx, sim);
    paintRail(ctx, scroll * 1.08);
    paintFloaters(ctx, sim.floaters);
    if (sim.speed > 460 || sim.rampMul > 1.12) paintSpeedLines(ctx, sim);
    if (sim.flash > 0.02) {
      ctx.fillStyle = `rgba(236,238,239,${sim.flash * 0.28})`;
      ctx.fillRect(-20, -20, WORLD_W + 40, WORLD_H + 40);
    }
  }
  function paintTowers(ctx, scroll) {
    const period = 980;
    const base = -(scroll % period + period) % period;
    ctx.fillStyle = "#1b232a";
    for (let k = -1; k <= 2; k++) {
      const ox = base + k * period;
      for (const t of TOWERS) {
        const x = ox + t.x;
        const y = GROUND_Y - 36 - t.h;
        ctx.fillRect(x, y, t.w, t.h);
        ctx.fillStyle = "#24303a";
        ctx.fillRect(x + t.w * 0.35, y - 16, Math.max(4, t.w * 0.12), 18);
        ctx.fillStyle = "#1b232a";
      }
    }
  }
  function paintRack(ctx, scroll) {
    ctx.strokeStyle = "#2c3842";
    ctx.lineWidth = 3;
    const y0 = GROUND_Y - 168;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-20, y0 + i * 14);
      ctx.lineTo(WORLD_W + 20, y0 + i * 14);
      ctx.stroke();
    }
    const gap = 150;
    const off = -(scroll % gap + gap) % gap;
    ctx.lineWidth = 2;
    for (let x = off; x < WORLD_W + gap; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, y0 - 8);
      ctx.lineTo(x, y0 + 36);
      ctx.stroke();
    }
  }
  function paintGround(ctx, scroll) {
    ctx.fillStyle = "#1c2329";
    ctx.fillRect(-40, GROUND_Y, WORLD_W + 80, WORLD_H - GROUND_Y + 40);
    ctx.fillStyle = "#2a333b";
    ctx.fillRect(-40, GROUND_Y, WORLD_W + 80, 8);
    ctx.strokeStyle = "rgba(236,238,239,0.08)";
    ctx.lineWidth = 1;
    const gap = 32;
    const off = -(scroll % gap + gap) % gap;
    for (let x = off; x < WORLD_W + gap; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 8);
      ctx.lineTo(x - 18, WORLD_H);
      ctx.stroke();
    }
  }
  function paintRail(ctx, scroll) {
    ctx.strokeStyle = "rgba(127,158,174,0.35)";
    ctx.lineWidth = 2;
    const y = GROUND_Y + 28;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(WORLD_W + 10, y);
    ctx.stroke();
    const gap = 70;
    const off = -(scroll % gap + gap) % gap;
    for (let x = off; x < WORLD_W + gap; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 8);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
    }
  }
  function paintParticles(ctx, particles) {
    for (const p of particles) {
      if (p.life <= 0) continue;
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
  function paintFloaters(ctx, floaters) {
    ctx.font = "500 18px 'IBM Plex Sans', sans-serif";
    ctx.textAlign = "center";
    for (const f of floaters) {
      if (f.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = MIST;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
  function paintSpeedLines(ctx, sim) {
    ctx.strokeStyle = "rgba(236,238,239,0.18)";
    ctx.lineWidth = 2;
    const n = sim.rampMul > 1.12 ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const y = 80 + (i * 97 + sim.time * 220) % (GROUND_Y - 100);
      const x = (sim.time * (300 + i * 40) + i * 140) % (WORLD_W + 160) - 80;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 36 - i * 4, y);
      ctx.stroke();
    }
  }
  function paintPlayer(ctx, sim) {
    const sliding = sim.slideT > 0 && sim.grounded && sim.phase !== "crash";
    const w = sim.playerW;
    const h = sliding ? sim.slideH : sim.standH;
    const x = PLAYER_X + (sim.phase === "crash" ? sim.crashT * 70 : 0);
    const y = sim.feet - h;
    const suit = sim.suit;
    const dark = mix(suit, INK, 0.38);
    const helm = sim.helmet;
    ctx.save();
    ctx.translate(x + w / 2, sim.feet);
    if (sim.phase === "crash") ctx.rotate(Math.min(1.15, sim.crashT * 2.4));
    else if (!sim.grounded) ctx.rotate(clampRot(sim.vy));
    const sy = sim.reduced ? 1 : sim.squash;
    const sx = 1 / sy;
    if (!sliding && sim.phase !== "crash") ctx.scale(sx, sy);
    ctx.translate(-w / 2, -h);
    if (sliding) {
      round(ctx, 0, h * 0.25, w, h * 0.7, 8);
      ctx.fillStyle = suit;
      ctx.fill();
      ctx.fillStyle = helm;
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.42, h * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      round(ctx, -6, h * 0.55, w * 0.45, h * 0.28, 6);
      ctx.fill();
    } else {
      const swing = sim.grounded && sim.phase !== "crash" ? Math.sin(sim.runPhase) : sim.vy < 0 ? -0.5 : 0.35;
      const bob = sim.grounded && sim.phase !== "crash" ? Math.abs(Math.sin(sim.runPhase)) * -3 : 0;
      ctx.translate(0, bob);
      limb(ctx, w * 0.38, h * 0.48, h * 0.48, 7, 0.4 + swing * 0.7, dark);
      limb(ctx, w * 0.62, h * 0.48, h * 0.48, 7, 0.4 - swing * 0.7, dark);
      round(ctx, w * 0.18, h * 0.28, w * 0.64, h * 0.4, 8);
      ctx.fillStyle = suit;
      ctx.fill();
      limb(ctx, w * 0.22, h * 0.34, h * 0.34, 6, -0.8 - swing * 0.5, dark);
      limb(ctx, w * 0.78, h * 0.34, h * 0.34, 6, -0.2 + swing * 0.5, dark);
      ctx.fillStyle = "#b7a99a";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.2, w * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = helm;
      round(ctx, w * 0.22, h * 0.02, w * 0.56, h * 0.16, 6);
      ctx.fill();
      ctx.fillRect(w * 0.16, h * 0.12, w * 0.68, 3);
      ctx.fillStyle = mix(helm, INK, 0.45);
      round(ctx, w * 0.3, h * 0.08, w * 0.28, h * 0.06, 2);
      ctx.fill();
    }
    if (sim.flash > 0.35 && sim.phase === "crash") {
      ctx.globalAlpha = sim.flash * 0.7;
      ctx.fillStyle = MIST;
      round(ctx, -2, -2, w + 4, h + 4, 8);
      ctx.fill();
    }
    ctx.restore();
  }
  function clampRot(vy) {
    return Math.max(-0.25, Math.min(0.35, vy / 2800));
  }
  function limb(ctx, x, y, len, thick, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    round(ctx, -thick / 2, 0, thick, len, thick / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, len, thick * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawGlyph(ctx, token, cssW, cssH, fill, trim) {
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = SKY_BOTTOM;
    ctx.fillRect(0, 0, cssW, cssH);
    const ground = cssH * 0.78;
    ctx.fillStyle = "#1c2329";
    ctx.fillRect(0, ground, cssW, cssH - ground);
    ctx.fillStyle = "#2a333b";
    ctx.fillRect(0, ground, cssW, 6);
    const pad = 28;
    const maxW = cssW - pad * 2;
    const maxH = ground - 24;
    const scale = Math.min(maxW / Math.max(token.width, 1), maxH / Math.max(token.height, 1), 2.2);
    const w = token.width * scale;
    const h = token.height * scale;
    const x = (cssW - w) / 2;
    const y = token.kind === "obstacle" && token.dodge === "slide" ? 28 : ground - h;
    paintShape(ctx, token.shape, x, y, w, h, fill, trim, 0);
  }
  function paintShape(ctx, shape, x, y, w, h, fill, trim, flash) {
    const color = flash > 0.2 ? mix(fill, MIST, Math.min(1, flash)) : fill;
    const dark = mix(color, INK, 0.4);
    const edge = mix(color, MIST, 0.28);
    ctx.save();
    switch (shape) {
      case "operator":
        drawOperatorMark(ctx, x, y, w, h, color, trim);
        break;
      case "valve":
        drawValve(ctx, x, y, w, h, color, dark, edge);
        break;
      case "elbow":
        drawElbow(ctx, x, y, w, h, color, dark);
        break;
      case "pump":
        drawPump(ctx, x, y, w, h, color, dark, trim);
        break;
      case "flange":
        drawFlange(ctx, x, y, w, h, color, dark);
        break;
      case "reactor":
        drawReactor(ctx, x, y, w, h, color, dark, trim);
        break;
      case "steam":
        drawSteam(ctx, x, y, w, h, color, dark, trim);
        break;
      case "exchanger":
        drawExchanger(ctx, x, y, w, h, color, dark, edge);
        break;
      case "tray":
        drawTray(ctx, x, y, w, h, color, dark);
        break;
      case "ramp":
        drawRamp(ctx, x, y, w, h, color, edge);
        break;
      case "vial":
        drawVial(ctx, x, y, w, h, color, trim);
        break;
      case "pellet":
        drawPellet(ctx, x, y, w, h, color, trim);
        break;
      default:
        round(ctx, x, y, w, h, 6);
        ctx.fillStyle = color;
        ctx.fill();
    }
    ctx.restore();
  }
  function drawOperatorMark(ctx, x, y, w, h, color, trim) {
    const dark = mix(color, INK, 0.4);
    round(ctx, x + w * 0.28, y + h * 0.32, w * 0.44, h * 0.34, 6);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = dark;
    round(ctx, x + w * 0.3, y + h * 0.62, w * 0.16, h * 0.36, 4);
    ctx.fill();
    round(ctx, x + w * 0.54, y + h * 0.62, w * 0.16, h * 0.36, 4);
    ctx.fill();
    ctx.fillStyle = "#b7a99a";
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.22, w * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = trim;
    round(ctx, x + w * 0.3, y + h * 0.04, w * 0.4, h * 0.12, 4);
    ctx.fill();
  }
  function drawValve(ctx, x, y, w, h, color, dark, edge) {
    const bodyH = h * 0.34;
    const bodyY = y + h - bodyH - 2;
    ctx.fillStyle = dark;
    ctx.fillRect(x, bodyY, w * 0.16, bodyH);
    ctx.fillRect(x + w * 0.84, bodyY, w * 0.16, bodyH);
    round(ctx, x + w * 0.12, bodyY + bodyH * 0.15, w * 0.76, bodyH * 0.7, 6);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.fillRect(x + w * 0.46, y + h * 0.22, w * 0.08, bodyY - y - h * 0.08);
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(2, w * 0.06);
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.2, Math.min(w, h) * 0.16, 0, Math.PI * 2);
    ctx.stroke();
  }
  function drawElbow(ctx, x, y, w, h, color, dark) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.min(w, h) * 0.32;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(x + 4, y + h - ctx.lineWidth * 0.2);
    ctx.lineTo(x + w * 0.48, y + h - ctx.lineWidth * 0.2);
    ctx.quadraticCurveTo(x + w - ctx.lineWidth, y + h - ctx.lineWidth * 0.2, x + w - ctx.lineWidth * 0.7, y + 8);
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + h - ctx.lineWidth, 10, ctx.lineWidth);
    ctx.fillRect(x + w - ctx.lineWidth * 1.15, y, ctx.lineWidth, 10);
  }
  function drawPump(ctx, x, y, w, h, color, dark, trim) {
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + w * 0.38, y + h * 0.48, Math.min(w, h) * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(x + w * 0.38, y + h * 0.48, Math.min(w, h) * 0.12, 0, Math.PI * 2);
    ctx.fill();
    round(ctx, x + w * 0.52, y + h * 0.28, w * 0.4, h * 0.36, 4);
    ctx.fillStyle = trim;
    ctx.fill();
  }
  function drawFlange(ctx, x, y, w, h, color, dark) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const fw = w / (n + 0.6);
      const fx = x + i * (fw + 3);
      ctx.fillStyle = i % 2 ? dark : color;
      round(ctx, fx, y + h * 0.12, fw, h * 0.76, 3);
      ctx.fill();
      ctx.fillStyle = MIST;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(fx + fw / 2, y + h * 0.28, 2, 0, Math.PI * 2);
      ctx.arc(fx + fw / 2, y + h * 0.72, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function drawReactor(ctx, x, y, w, h, color, dark, trim) {
    ctx.fillStyle = dark;
    ctx.fillRect(x + w * 0.12, y + h * 0.82, w * 0.1, h * 0.18);
    ctx.fillRect(x + w * 0.78, y + h * 0.82, w * 0.1, h * 0.18);
    round(ctx, x + w * 0.12, y + h * 0.28, w * 0.76, h * 0.56, w * 0.2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.3, w * 0.38, h * 0.14, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = trim;
    round(ctx, x + w * 0.4, y, w * 0.2, h * 0.22, 3);
    ctx.fill();
  }
  function drawSteam(ctx, x, y, w, h, color, dark, trim) {
    const thick = h * 0.42;
    const py = y + h * 0.28;
    round(ctx, x, py, w, thick, thick / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(x + w * 0.2, y, 4, py - y);
    ctx.fillRect(x + w * 0.7, y, 4, py - y);
    ctx.strokeStyle = trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w * 0.45, py + thick * 0.5, thick * 0.28, 0, Math.PI * 2);
    ctx.stroke();
  }
  function drawExchanger(ctx, x, y, w, h, color, dark, edge) {
    round(ctx, x, y + h * 0.22, w, h * 0.56, h * 0.2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + h * 0.28, w * 0.1, h * 0.44);
    ctx.fillRect(x + w * 0.9, y + h * 0.28, w * 0.1, h * 0.44);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) {
      const yy = y + h * 0.22 + h * 0.56 * i / 4;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.12, yy);
      ctx.lineTo(x + w * 0.88, yy);
      ctx.stroke();
    }
  }
  function drawTray(ctx, x, y, w, h, color, dark) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, h * 0.12);
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.25);
    ctx.lineTo(x + w, y + h * 0.25);
    ctx.moveTo(x, y + h * 0.75);
    ctx.lineTo(x + w, y + h * 0.75);
    ctx.stroke();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    const step = Math.max(12, w / 7);
    for (let px = x + 8; px < x + w - 4; px += step) {
      ctx.beginPath();
      ctx.moveTo(px, y + h * 0.25);
      ctx.lineTo(px, y + h * 0.75);
      ctx.stroke();
    }
  }
  function drawRamp(ctx, x, y, w, h, color, edge) {
    round(ctx, x, y, w, h, 4);
    ctx.fillStyle = mix(color, INK, 0.25);
    ctx.fill();
    ctx.fillStyle = edge;
    const step = 16;
    for (let i = 8; i < w - 8; i += step) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h * 0.75);
      ctx.lineTo(x + i + 8, y + h * 0.25);
      ctx.lineTo(x + i + 12, y + h * 0.25);
      ctx.lineTo(x + i + 4, y + h * 0.75);
      ctx.fill();
    }
  }
  function drawVial(ctx, x, y, w, h, color, trim) {
    ctx.fillStyle = trim;
    round(ctx, x + w * 0.35, y, w * 0.3, h * 0.22, 2);
    ctx.fill();
    ctx.fillStyle = color;
    round(ctx, x + w * 0.2, y + h * 0.18, w * 0.6, h * 0.8, 6);
    ctx.fill();
    ctx.fillStyle = mix(color, MIST, 0.35);
    ctx.fillRect(x + w * 0.32, y + h * 0.4, w * 0.12, h * 0.4);
  }
  function drawPellet(ctx, x, y, w, h, color, trim) {
    const spots = [
      [0.35, 0.6, 0.28],
      [0.62, 0.55, 0.24],
      [0.48, 0.32, 0.2]
    ];
    spots.forEach((s, i) => {
      ctx.fillStyle = i === 2 ? trim : color;
      ctx.beginPath();
      ctx.arc(x + w * s[0], y + h * s[1], Math.min(w, h) * s[2], 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function round(ctx, x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), rad);
  }

  // src/game/format.ts
  var int = new Intl.NumberFormat("de-DE");
  var dec = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function formatInt(n) {
    return int.format(Math.round(n));
  }
  function formatDec(n) {
    return dec.format(n);
  }
  return __toCommonJS(dye_entry_exports);
})();
