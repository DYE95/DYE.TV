(function () {
  const q = new URLSearchParams(location.search);
  if (q.get("spur") !== "1") return;
  const back = q.get("back") || "/player";
  const characterId = localStorage.getItem("ember.characterId") || "";
  const bar = document.createElement("div");
  bar.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:40;display:flex;gap:8px;align-items:center;padding:8px;background:#1a100c;border:1px solid #e85d04;color:#f3e6d8;font:14px/1.3 sans-serif;";
  const label = document.createElement("b");
  label.style.flex = "1";
  label.textContent = "Ereignis";
  const leave = document.createElement("button");
  leave.textContent = "Zurück";
  leave.style.cssText = "background:#3b1408;color:#f4d6a0;border:1px solid #e85d04;padding:6px 10px;";
  bar.appendChild(label);
  bar.appendChild(leave);
  document.body.appendChild(bar);

  let last = null;
  let sent = false;
  let left = false;

  async function post(score) {
    if (sent || score == null || score === "") return;
    sent = true;
    await fetch("/api/session/spur/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, score: String(score), choice: window.emberChoice || "", note: document.title }),
    }).catch(() => {});
  }

  function finishScore() {
    if (typeof window.emberFinish === "function") {
      const n = window.emberFinish();
      if (n != null && n !== "") last = Number(n);
    }
    return last == null ? 0 : last;
  }

  window.emberHold = (n) => {
    const value = Number(n);
    if (Number.isFinite(value)) last = value;
  };
  window.emberReport = (n) => {
    window.emberHold(n);
    post(last);
  };

  async function tick() {
    const res = await fetch("/api/state").catch(() => null);
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    const event = (data.sessions || []).find((s) => s.id === data.active?.sessionId)?.spur;
    if (!event) {
      label.textContent = sent ? "Gemeldet." : "Ereignis ist vorbei.";
      if (!left) {
        left = true;
        setTimeout(() => { location.href = back; }, 700);
      }
      return;
    }
    const secs = event.endsAt ? Math.max(0, Math.ceil((event.endsAt - Date.now()) / 1000)) : 0;
    label.textContent = event.title + " · " + secs + "s" + (last == null ? "" : " · " + last);
    if (secs <= 0) post(finishScore());
  }

  leave.addEventListener("click", () => { location.href = back; });
  tick();
  setInterval(tick, 1000);
})();
