// Tisch-Hub: was der Knopf "Rein" gerade kann. Rein rechnerisch, damit es
// ohne Browser testbar ist (test/ember-hub.test.js).
// Früher war der Knopf aus, solange niemand sass. Ohne Spieler (frische
// Installation, Testlauf allein am PC) kam man nie an "Session öffnen".
(function (root) {
  function hubEnter(info) {
    const seated = Math.max(0, Number(info && info.seated) || 0);
    const ready = Math.min(seated, Math.max(0, Number(info && info.ready) || 0));
    if (!(info && info.hasCampaign)) {
      return { action: "campaign", disabled: false, auto: false, label: "Erst eine Kampagne wählen", hint: "Noch keine Kampagne. Im Campaign Manager eine anlegen oder den Sablewood Quickstart laden." };
    }
    if (seated > 0 && ready === seated) {
      return { action: "enter", disabled: false, auto: true, label: "Alle ready. Rein.", hint: "" };
    }
    if (seated === 0) {
      return { action: "enter", disabled: false, auto: false, label: "Rein, der Tisch ist noch leer", hint: "Spieler können später dazukommen." };
    }
    return { action: "enter", disabled: false, auto: false, label: "Rein, ohne zu warten (" + ready + " von " + seated + " bereit)", hint: "" };
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { hubEnter };
  else root.hubEnter = hubEnter;
})(typeof window !== "undefined" ? window : globalThis);
