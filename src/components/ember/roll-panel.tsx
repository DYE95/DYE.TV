import { useState } from "react";
import { TRAITS, traitLabel, type RollMode, type TraitKey } from "@/lib/ember/rules";
import { useEmber } from "@/lib/ember/store";
import { ActionButton, Field, fieldClass } from "./chrome";

export function RollPanel({ characterId }: { characterId?: string | null }) {
  const characters = useEmber((s) => s.characters);
  const lastRoll = useEmber((s) => s.lastRoll);
  const rollFor = useEmber((s) => s.rollFor);
  const undoRoll = useEmber((s) => s.undoRoll);
  const [picked, setPicked] = useState<string>(characterId || characters[0]?.id || "");
  const locked = characterId !== undefined;
  const who = locked ? characterId : picked || null;
  const pc = characters.find((character) => character.id === who);
  const [trait, setTrait] = useState<TraitKey>("agility");
  const [mode, setMode] = useState<RollMode>("none");
  const [difficulty, setDifficulty] = useState(12);
  const [spent, setSpent] = useState<string[]>([]);
  const [spin, setSpin] = useState(false);

  function toggleExp(id: string) {
    setSpent((current) => (current.includes(id) ? current.filter((exp) => exp !== id) : [...current, id]));
  }

  function throwDice() {
    if (spin) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSpin(true);
    window.setTimeout(() => {
      rollFor(who, { trait, mode, difficulty: Number(difficulty) || 0, experienceIds: spent });
      setSpin(false);
    }, reduce ? 0 : 520);
  }

  const show = !spin && lastRoll && (!locked || lastRoll.characterId === who) ? lastRoll : null;

  return (
    <div className="grid gap-4">
      {!locked ? (
        <Field label="Bogen">
          <select className={fieldClass} value={who || ""} onChange={(event) => setPicked(event.target.value)}>
            <option value="">Ohne Bogen</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="font-serif text-xl text-gold">{pc?.name || "Kein Sitz"}</p>
      )}

      <div>
        <p className="mb-1.5 text-xs tracking-[0.14em] text-muted uppercase">Eigenschaft</p>
        <div className="grid grid-cols-2 gap-2">
          {TRAITS.map((entry) => {
            const mod = pc ? pc.traits[entry.key] : 0;
            const on = trait === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setTrait(entry.key)}
                className={`flex min-h-11 items-center justify-between rounded-lg border px-3 text-left text-sm ${on ? "border-ember text-gold" : "border-line text-fg"}`}
              >
                <span>{entry.label}</span>
                <span className="font-serif">{mod > 0 ? `+${mod}` : mod}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["none", "Glatt"],
            ["advantage", "Vorteil"],
            ["disadvantage", "Nachteil"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`min-h-11 rounded-lg border px-2 text-sm ${mode === id ? "border-ember text-gold" : "border-line text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="Schwierigkeit">
        <input
          className={fieldClass}
          inputMode="numeric"
          value={difficulty}
          onChange={(event) => setDifficulty(Number(event.target.value.replace(/[^\d]/g, "")) || 0)}
        />
      </Field>

      {pc && pc.experiences.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs tracking-[0.14em] text-muted uppercase">Erfahrungen · jede kostet Hope</p>
          <div className="flex flex-wrap gap-2">
            {pc.experiences.map((exp) => {
              const on = spent.includes(exp.id);
              return (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => toggleExp(exp.id)}
                  className={`min-h-11 rounded-full border px-3 text-sm ${on ? "border-hope text-hope" : "border-line text-muted"}`}
                >
                  {exp.name} +{exp.bonus}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <ActionButton tone="primary" onClick={throwDice} disabled={spin || (locked && !pc)}>
        {spin ? "Die Glut dreht …" : "Duality werfen"}
      </ActionButton>

      <div className="grid grid-cols-2 gap-3" aria-live="polite">
        <Die kind="hope" label="Hope" value={spin ? null : show?.roll.hopeDie ?? null} spinning={spin} />
        <Die kind="fear" label="Fear" value={spin ? null : show?.roll.fearDie ?? null} spinning={spin} />
      </div>

      {show ? (
        <div className={`rounded-xl border p-3 ${show.roll.success ? "border-hope" : "border-fear"} ${show.undone ? "opacity-60" : ""}`}>
          <p className="font-serif text-lg text-gold">{show.undone ? "Zurückgenommen" : show.roll.label}</p>
          <p className="mt-1 text-sm text-fg">{show.name}</p>
          <p className="mt-1 text-sm text-muted">{show.roll.spoken}</p>
          <p className="mt-2 text-xs text-muted">{traitLabel(trait)} · Summe {show.roll.total}</p>
          {!show.undone ? (
            <div className="mt-3">
              <ActionButton onClick={undoRoll}>Wurf zurücknehmen</ActionButton>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">Hope und Fear, zwei W12. Gleichstand ist kritisch.</p>
      )}
    </div>
  );
}

function Die({ kind, label, value, spinning }: { kind: "hope" | "fear"; label: string; value: number | null; spinning: boolean }) {
  return (
    <div className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border ${kind === "hope" ? "border-hope" : "border-ember"} ${spinning ? "motion-safe:animate-pulse" : ""}`}>
      <span className="text-xs tracking-[0.16em] text-muted uppercase">{label}</span>
      <span className={`font-serif text-4xl ${kind === "hope" ? "text-hope" : "text-ember"}`}>{value ?? "·"}</span>
    </div>
  );
}
