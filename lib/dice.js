function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

function resolveActionRoll(input) {
  const hopeDie = Number(input.hopeDie || rollDie(12));
  const fearDie = Number(input.fearDie || rollDie(12));
  const traitMod = Number(input.traitMod || 0);
  const experiences = input.experiences || [];
  const expBonus = experiences.reduce((s, e) => s + Number(e.bonus || 0), 0);
  let adv = Number(input.advantageDie || 0);
  if (!adv && input.mode === "advantage") adv = rollDie(6);
  if (!adv && input.mode === "disadvantage") adv = rollDie(6);
  const signedAdv = input.mode === "disadvantage" ? -adv : input.mode === "advantage" ? adv : 0;
  const total = hopeDie + fearDie + traitMod + expBonus + signedAdv;
  const critical = hopeDie === fearDie;
  const withHope = hopeDie > fearDie;
  const difficulty = Number(input.difficulty || 0);
  const success = !difficulty || total >= difficulty || critical;
  let hopeDelta = 0;
  let fearDelta = 0;
  if (critical) hopeDelta = 1;
  else if (withHope) hopeDelta = 1;
  else fearDelta = 1;
  if (experiences.length) hopeDelta -= experiences.length;
  const outcome = {
    label: critical ? "Critical Success" : success ? (withHope ? "Success with Hope" : "Success with Fear") : (withHope ? "Failure with Hope" : "Failure with Fear"),
    success,
    critical,
    withHope,
  };
  const traitStr = traitMod > 0 ? "+" + traitMod : String(traitMod);
  const spoken = `Hope ${hopeDie} · Fear ${fearDie}${signedAdv ? " · W6 " + signedAdv : ""} ${traitStr}${expBonus ? " +XP " + expBonus : ""} = ${total}${difficulty ? " gegen " + difficulty : ""} — ${outcome.label}`;
  return {
    hopeDie,
    fearDie,
    advantageDie: adv || null,
    mode: input.mode || "none",
    total,
    hopeDelta,
    fearDelta,
    outcome,
    spoken,
  };
}

function applyPools(pools, roll) {
  const hopeMax = pools.hopeMax == null ? 6 : Number(pools.hopeMax);
  const fearMax = pools.fearMax == null ? 12 : Number(pools.fearMax);
  const hopeBefore = Number(pools.hope || 0);
  const fearBefore = Number(pools.fear || 0);
  const rawHope = hopeBefore + Number(roll.hopeDelta || 0);
  const rawFear = fearBefore + Number(roll.fearDelta || 0);
  const unpaid = rawHope < 0 ? -rawHope : 0;
  const clockTick = rawFear > fearMax ? 1 : 0;
  return {
    hope: Math.max(0, Math.min(hopeMax, rawHope)),
    fear: Math.max(0, Math.min(fearMax, rawFear)),
    unpaid,
    clockTick,
    hopeMax,
    fearMax,
  };
}

module.exports = { resolveActionRoll, applyPools, rollDie };
