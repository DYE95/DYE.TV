const { id } = require("./ids");

function blank() {
  return { on: false, auto: true, round: 1, index: 0, order: [] };
}

function ensure(session) {
  if (!session.initiative || typeof session.initiative !== "object") session.initiative = blank();
  const init = session.initiative;
  init.order = Array.isArray(init.order) ? init.order : [];
  init.round = Number(init.round) || 1;
  init.index = Number(init.index) || 0;
  if (init.auto == null) init.auto = true;
  if (init.index < 0) init.index = 0;
  if (init.order.length && init.index >= init.order.length) init.index = 0;
  return init;
}

function rowFromToken(token, kind) {
  return {
    id: id("ini"),
    label: token.label || (kind === "foe" ? "Foe" : "Jemand"),
    kind,
    characterId: token.characterId || null,
    tokenId: token.id || null,
  };
}

function seed(session) {
  const init = ensure(session);
  const tokens = session.map?.tokens || [];
  const order = [];
  tokens.filter((t) => t.kind === "pc").forEach((t) => order.push(rowFromToken(t, "pc")));
  tokens.filter((t) => t.kind === "foe").forEach((t) => order.push(rowFromToken(t, "foe")));
  order.push({ id: id("ini"), label: "SL", kind: "gm", characterId: null, tokenId: null });
  init.order = order;
  init.index = 0;
  init.round = 1;
  init.on = order.length > 0;
  if (init.auto == null) init.auto = true;
  return init;
}

function live(session) {
  const enc = (session.encounters || []).find((e) => e.id === session.activeEncounterId) || (session.encounters || [])[0];
  return Boolean(enc && enc.status === "live");
}

function markTurn(init) {
  if (init.order[init.index]) init.order[init.index].acted = false;
}

function current(session) {
  const init = ensure(session);
  if (!init.on || !init.order.length) return null;
  return init.order[init.index] || null;
}

function apply(session, body) {
  const init = ensure(session);
  const action = body.action || "seed";
  if (action === "seed") return seed(session);
  if (action === "off") {
    init.on = false;
    return init;
  }
  if (action === "on") {
    if (!init.order.length) seed(session);
    else init.on = true;
    return ensure(session);
  }
  if (action === "add") {
    init.order.push({
      id: id("ini"),
      label: body.label || "Jemand",
      kind: body.kind || "foe",
      characterId: body.characterId || null,
      tokenId: body.tokenId || null,
    });
    init.on = true;
    return init;
  }
  if (action === "remove") {
    const i = init.order.findIndex((x) => x.id === body.id);
    if (i >= 0) {
      init.order.splice(i, 1);
      if (i < init.index) init.index -= 1;
    }
    if (!init.order.length) init.index = 0;
    else if (init.index >= init.order.length) init.index = 0;
    return init;
  }
  if (action === "up" || action === "down") {
    const i = init.order.findIndex((x) => x.id === body.id);
    const j = action === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < init.order.length) {
      const [row] = init.order.splice(i, 1);
      init.order.splice(j, 0, row);
      if (init.index === i) init.index = j;
      else if (init.index === j) init.index = i;
    }
    return init;
  }
  if (action === "next") {
    if (!init.order.length) seed(session);
    if (!init.order.length) return init;
    init.on = true;
    init.index += 1;
    if (init.index >= init.order.length) {
      init.index = 0;
      init.round += 1;
    }
    markTurn(init);
    return init;
  }
  if (action === "prev") {
    if (!init.order.length) return init;
    init.on = true;
    init.index -= 1;
    if (init.index < 0) {
      init.index = init.order.length - 1;
      init.round = Math.max(1, init.round - 1);
    }
    return init;
  }
  if (action === "set") {
    const i = init.order.findIndex((x) => x.id === body.id);
    if (i >= 0) init.index = i;
    init.on = true;
    return init;
  }
  if (action === "auto") {
    init.auto = body.on !== false;
    return init;
  }
  if (action === "side") {
    if (!init.order.length) return init;
    init.on = true;
    const foeAt = init.order.findIndex((row) => row.kind !== "pc");
    if (foeAt < 0) return init;
    if (current(session)?.kind === "pc") {
      init.index = foeAt;
      markTurn(init);
      return init;
    }
    let steps = 0;
    while (steps < init.order.length && current(session)?.kind !== "pc") {
      apply(session, { action: "next" });
      steps += 1;
    }
    return init;
  }
  return init;
}

function completeIfActor(session, characterId) {
  const init = ensure(session);
  if (!live(session) || !init.on || init.auto === false || !characterId || !init.order.length) return false;
  const who = current(session);
  if (!who || who.kind !== "pc" || who.characterId !== characterId || who.acted) return false;
  who.acted = true;
  apply(session, { action: "next" });
  return true;
}

function spoken(session) {
  const init = ensure(session);
  const who = current(session);
  if (!who) return "";
  return "Runde " + init.round + " — " + who.label + " ist dran.";
}

module.exports = { blank, ensure, seed, current, apply, spoken, completeIfActor };
