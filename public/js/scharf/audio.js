let ctx = null;
let muted = false;
export function unlockAudio() {
    if (typeof window === "undefined")
        return;
    if (!ctx)
        ctx = new AudioContext();
    if (ctx.state === "suspended")
        void ctx.resume();
}
export function setMuted(next) {
    muted = next;
}
export function isMuted() {
    return muted;
}
function envGain(at, peak, attack, release) {
    if (!ctx)
        return null;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
    gain.connect(ctx.destination);
    return gain;
}
function tone(freq, dur, type, peak, slide = 1) {
    if (!ctx || muted)
        return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = envGain(t, peak, 0.01, dur);
    if (!gain)
        return;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}
function noise(dur, peak, hp = 800) {
    if (!ctx || muted)
        return;
    const t = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < frames; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.82 + white * 0.18;
        data[i] = last;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const gain = envGain(t, peak, 0.005, dur);
    if (!gain)
        return;
    src.connect(filter);
    filter.connect(gain);
    src.start(t);
    src.stop(t + dur + 0.02);
}
let lastMg = 0;
export function playShot(kind) {
    unlockAudio();
    if (kind === "mg") {
        const now = typeof performance !== "undefined" ? performance.now() : 0;
        if (now - lastMg < 55)
            return;
        lastMg = now;
        noise(0.045, 0.045, 1400);
        tone(480, 0.035, "square", 0.025, 0.55);
    }
    else if (kind === "sniper") {
        noise(0.12, 0.09, 400);
        tone(220, 0.16, "sawtooth", 0.05, 0.35);
    }
    else {
        tone(90, 0.22, "sine", 0.08, 0.5);
        noise(0.18, 0.06, 180);
    }
}
export function playHit(kind) {
    unlockAudio();
    if (kind === "kill") {
        tone(660, 0.07, "square", 0.03, 1.4);
        tone(880, 0.09, "triangle", 0.025, 1);
    }
    else if (kind === "boom") {
        noise(0.22, 0.08, 200);
        tone(70, 0.25, "sine", 0.07, 0.4);
    }
    else {
        tone(180, 0.2, "sawtooth", 0.05, 0.5);
        tone(120, 0.28, "square", 0.03, 0.7);
    }
}
export function playUi(kind) {
    unlockAudio();
    if (kind === "click")
        tone(520, 0.05, "triangle", 0.03, 1.2);
    else if (kind === "deny")
        tone(180, 0.08, "square", 0.03, 0.7);
    else if (kind === "wave") {
        tone(240, 0.12, "triangle", 0.04, 1.3);
        tone(360, 0.16, "triangle", 0.035, 1.2);
    }
    else if (kind === "win") {
        [523, 659, 784, 1046].forEach((f, i) => {
            setTimeout(() => tone(f, 0.18, "triangle", 0.04, 1), i * 110);
        });
    }
    else {
        [392, 330, 262, 196].forEach((f, i) => {
            setTimeout(() => tone(f, 0.2, "sawtooth", 0.03, 0.8), i * 140);
        });
    }
}
