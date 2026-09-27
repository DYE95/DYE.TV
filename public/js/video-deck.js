function attachVideoDeck(video) {
  if (!video || video.dataset.deck === "1") return;
  video.dataset.deck = "1";
  video.tabIndex = 0;

  const tools = document.createElement("div");
  tools.className = "video-deck";
  tools.innerHTML = `
    <label>Tempo
      <select data-role="rate">
        <option value="0.25">0.25×</option>
        <option value="0.5">0.5×</option>
        <option value="0.75">0.75×</option>
        <option value="1" selected>1×</option>
        <option value="1.25">1.25×</option>
        <option value="1.5">1.5×</option>
        <option value="2">2×</option>
      </select>
    </label>
    <label>fps
      <input data-role="fps" type="number" min="1" max="120" value="30" />
    </label>
    <button type="button" class="btn tiny" data-role="back">−1 Frame</button>
    <button type="button" class="btn tiny" data-role="fwd">+1 Frame</button>
    <span class="hint">Bild ↓ zurück · Bild ↑ vor · hält an</span>
  `;
  video.insertAdjacentElement("afterend", tools);

  const rate = tools.querySelector("[data-role=rate]");
  const fps = tools.querySelector("[data-role=fps]");
  let freeze = false;

  video.addEventListener("play", () => {
    if (freeze) {
      video.pause();
    }
  });

  function frameLen() {
    const n = Number(fps.value) || 30;
    return 1 / Math.max(1, n);
  }

  function ready() {
    return Boolean(video.currentSrc || video.src);
  }

  function step(dir) {
    if (!ready()) return;
    freeze = true;
    const span = frameLen() * dir;
    const dur = Number.isFinite(video.duration) ? video.duration : video.currentTime + Math.abs(span);
    const target = Math.min(Math.max(0, video.currentTime + span), Math.max(0, dur - 0.001));

    const seek = () => {
      try { video.pause(); } catch {}
      const finish = () => {
        try { video.pause(); } catch {}
        window.setTimeout(() => { freeze = false; }, 120);
      };
      if (Math.abs(video.currentTime - target) < 0.0005) {
        finish();
        return;
      }
      video.addEventListener("seeked", finish, { once: true });
      video.currentTime = target;
    };

    if (video.paused) {
      seek();
      return;
    }
    let applied = false;
    const once = () => {
      if (applied) return;
      applied = true;
      seek();
    };
    video.addEventListener("pause", once, { once: true });
    video.pause();
    window.setTimeout(once, 50);
  }

  rate.addEventListener("change", () => {
    video.playbackRate = Number(rate.value) || 1;
  });
  tools.querySelector("[data-role=back]").addEventListener("click", () => step(-1));
  tools.querySelector("[data-role=fwd]").addEventListener("click", () => step(1));

  function onKey(ev) {
    const tag = ev.target && ev.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (!ready()) return;
    if (ev.key === "PageUp") {
      ev.preventDefault();
      ev.stopPropagation();
      step(1);
    } else if (ev.key === "PageDown") {
      ev.preventDefault();
      ev.stopPropagation();
      step(-1);
    } else if (ev.key === "<" || ev.key === ",") {
      ev.preventDefault();
      video.playbackRate = Math.max(0.25, Math.round((video.playbackRate - 0.25) * 100) / 100);
      rate.value = String(video.playbackRate);
    } else if (ev.key === ">" || ev.key === ".") {
      ev.preventDefault();
      video.playbackRate = Math.min(2, Math.round((video.playbackRate + 0.25) * 100) / 100);
      rate.value = String(video.playbackRate);
    }
  }
  document.addEventListener("keydown", onKey, true);
  video.addEventListener("keydown", onKey, true);
}

if (typeof window !== "undefined") window.attachVideoDeck = attachVideoDeck;
