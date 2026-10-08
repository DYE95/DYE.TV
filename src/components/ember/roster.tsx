import { Trash2 } from "lucide-react";
import { useState } from "react";
import { CLASSES, TRAITS, classLabel, nextCount } from "@/lib/ember/rules";
import { useEmber } from "@/lib/ember/store";
import { ActionButton, Field, Pips, fieldClass } from "./chrome";

export function Roster() {
  const characters = useEmber((s) => s.characters);
  const addCharacter = useEmber((s) => s.addCharacter);
  const removeCharacter = useEmber((s) => s.removeCharacter);
  const [name, setName] = useState("");
  const [klass, setKlass] = useState("Rogue");
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-3 rounded-xl border border-line bg-surface p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const id = addCharacter({ name, klass });
          setName("");
          setOpen(id);
        }}
      >
        <Field label="Neuer Bogen">
          <input className={fieldClass} value={name} placeholder="Name" onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Klasse">
          <select className={fieldClass} value={klass} onChange={(event) => setKlass(event.target.value)}>
            {CLASSES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </Field>
        <ActionButton type="submit" tone="primary">
          An den Tisch
        </ActionButton>
      </form>

      {characters.length === 0 ? <p className="text-sm text-muted">Noch niemand. Ein Name reicht.</p> : null}

      {characters.map((character) => {
        const shown = open === character.id;
        return (
          <article key={character.id} className="rounded-xl border border-line bg-surface">
            <button
              type="button"
              className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left"
              onClick={() => setOpen(shown ? null : character.id)}
            >
              <span>
                <span className="block font-serif text-lg text-gold">{character.name}</span>
                <span className="text-xs text-muted">
                  {classLabel(character.klass)} · Stufe {character.level} · PIN {character.pin}
                </span>
              </span>
              <span className="text-sm text-muted">{shown ? "Zu" : "Auf"}</span>
            </button>
            {shown ? (
              <div className="grid gap-4 border-t border-line p-3">
                <SheetEditor id={character.id} />
                <ActionButton
                  onClick={() => {
                    if (window.confirm(`${character.name} vom Tisch nehmen?`)) removeCharacter(character.id);
                  }}
                >
                  <Trash2 className="size-4" /> Bogen weg
                </ActionButton>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function SheetEditor({ id, player = false }: { id: string; player?: boolean }) {
  const character = useEmber((s) => s.characters.find((entry) => entry.id === id));
  const patchCharacter = useEmber((s) => s.patchCharacter);
  const setTrait = useEmber((s) => s.setTrait);
  const setPool = useEmber((s) => s.setPool);
  const addExperience = useEmber((s) => s.addExperience);
  const removeExperience = useEmber((s) => s.removeExperience);
  const [expName, setExpName] = useState("");

  if (!character) return <p className="text-sm text-muted">Der Bogen ist weg.</p>;

  return (
    <div className="grid gap-4">
      {!player ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className={fieldClass} value={character.name} onChange={(event) => patchCharacter(id, { name: event.target.value })} />
          </Field>
          <Field label="Herkunft">
            <input
              className={fieldClass}
              value={character.ancestry}
              onChange={(event) => patchCharacter(id, { ancestry: event.target.value })}
            />
          </Field>
        </div>
      ) : (
        <p className="text-sm text-muted">
          {classLabel(character.klass)}
          {character.ancestry ? ` · ${character.ancestry}` : ""} · Ausweichen {character.evasion} · PIN {character.pin}
        </p>
      )}

      <Pips label="Hope" tone="hope" count={character.hope} max={character.hopeMax} onPick={(index) => setPool(id, "hope", nextCount(character.hope, index, character.hopeMax))} />
      <Pips label="Stress" tone="stress" count={character.stress} max={character.stressMax} onPick={(index) => setPool(id, "stress", nextCount(character.stress, index, character.stressMax))} />
      <Pips label="Rüstung" tone="armor" count={character.armor} max={character.armorMax} onPick={(index) => setPool(id, "armor", nextCount(character.armor, index, character.armorMax))} />
      <Pips label="Schaden" tone="fear" count={character.hp} max={character.hpMax} onPick={(index) => setPool(id, "hp", nextCount(character.hp, index, character.hpMax))} />

      <div>
        <p className="mb-1.5 text-xs tracking-[0.14em] text-muted uppercase">Eigenschaften</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRAITS.map((trait) => (
            <div key={trait.key} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line px-2">
              <span className="text-sm">{trait.label}</span>
              <span className="flex items-center gap-1">
                <button type="button" className="grid size-11 place-items-center rounded-md border border-line" aria-label={`${trait.label} senken`} onClick={() => setTrait(id, trait.key, character.traits[trait.key] - 1)}>
                  −
                </button>
                <span className="w-6 text-center font-serif text-gold">
                  {character.traits[trait.key] > 0 ? `+${character.traits[trait.key]}` : character.traits[trait.key]}
                </span>
                <button type="button" className="grid size-11 place-items-center rounded-md border border-line" aria-label={`${trait.label} heben`} onClick={() => setTrait(id, trait.key, character.traits[trait.key] + 1)}>
                  +
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs tracking-[0.14em] text-muted uppercase">Erfahrungen</p>
        <ul className="grid gap-2">
          {character.experiences.map((exp) => (
            <li key={exp.id} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line px-3">
              <span>
                {exp.name} <span className="text-hope">+{exp.bonus}</span>
              </span>
              <button type="button" className="text-sm text-muted" onClick={() => removeExperience(id, exp.id)}>
                Weg
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!expName.trim()) return;
            addExperience(id, expName, 2);
            setExpName("");
          }}
        >
          <input className={fieldClass} value={expName} placeholder="Neue Erfahrung" onChange={(event) => setExpName(event.target.value)} />
          <ActionButton type="submit">+2</ActionButton>
        </form>
      </div>

      <Field label="Notizen">
        <textarea
          className={`${fieldClass} min-h-24 py-2`}
          value={character.notes}
          onChange={(event) => patchCharacter(id, { notes: event.target.value })}
        />
      </Field>
    </div>
  );
}
