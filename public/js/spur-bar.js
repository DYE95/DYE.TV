(function () {
  const q = new URLSearchParams(location.search);
  if (q.get("spur") !== "1") return;
  const bar = document.createElement("div");
  bar.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:40;display:flex;gap:8px;align-items:center;padding:8px;background:#1a100c;border:1px solid #e85d04;color:#f3e6d8;font:14px/1.3 sans-serif;";
  const back = q.get("back") || "/player";
  bar.innerHTML = "<b style='flex:1'>Ereignis</b>";
  const done = document.createElement("button");
  done.textContent = "Durch, zurück";
  done.style.cssText = "background:#3b1408;color:#f4d6a0;border:1px solid #e85d04;padding:6px 10px;";
  done.addEventListener("click", async () => {
    const score = prompt("Zahl oder ein Wort für den Tisch", "") || "durch";
    const characterId = localStorage.getItem("ember.characterId") || "";
    await fetch("/api/session/spur/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, score, note: document.title }),
    }).catch(() => {});
    location.href = back;
  });
  bar.appendChild(done);
  document.body.appendChild(bar);
})();
