import { createFileRoute } from "@tanstack/react-router";
import { Dices, Hand, Map, ScrollText } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Board } from "@/components/ember/board";
import { ActionButton, EmberHeader, Field, fieldClass, useHydrated } from "@/components/ember/chrome";
import { RollPanel } from "@/components/ember/roll-panel";
import { SheetEditor } from "@/components/ember/roster";
import { classLabel } from "@/lib/ember/rules";
import { useEmber } from "@/lib/ember/store";

export const Route = createFileRoute("/sitz")({
  component: Sitz,
});

type Tab = "bogen" | "wurf" | "karte";

function Sitz() {
  const ready = useHydrated();
  const characters = useEmber((s) => s.characters);
  const seatId = useEmber((s) => s.seatId);
  const sit = useEmber((s) => s.sit);
  const hands = useEmber((s) => s.hands);
  const raiseHand = useEmber((s) => s.raiseHand);
  const [tab, setTab] = useState<Tab>("bogen");
  const [pick, setPick] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  if (!ready) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <EmberHeader title="Sitz" eyebrow="Spieler" />
        <p className="p-6 text-muted">Der Sitz wird gelesen …</p>
      </div>
    );
  }

  const seated = characters.find((character) => character.id === seatId) || null;
  const chosen = characters.find((character) => character.id === pick) || null;

  function claim(event: FormEvent) {
    event.preventDefault();
    if (!chosen) return;
    if (pin.trim() !== chosen.pin) {
      setErr("Die Glut kennt die Zahl nicht.");
      return;
    }
    sit(chosen.id);
    setErr("");
    setPin("");
  }

  if (!seated) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <EmberHeader title="Ans Feuer" eyebrow="Spieler" />
        <div className="mx-auto grid max-w-lg gap-3 p-4">
          <p className="text-sm text-muted">Tippe deinen Namen. Die PIN steht auf dem Bogen am SL-Tisch.</p>
          {characters.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
              Noch kein Bogen. Die Spielleitung legt einen an, oder du gehst unter die Schwelle.
            </p>
          ) : null}
          {characters.map((character) => (
            <button
              key={character.id}
              type="button"
              onClick={() => {
                setPick(character.id);
                setErr("");
                setPin("");
              }}
              className={`min-h-14 rounded-xl border px-3 text-left ${pick === character.id ? "border-ember" : "border-line"} bg-surface`}
            >
              <span className="block font-serif text-lg text-gold">{character.name}</span>
              <span className="text-sm text-muted">{classLabel(character.klass)}</span>
            </button>
          ))}
          {chosen ? (
            <form className="grid gap-3" onSubmit={claim}>
              <Field label={`PIN für ${chosen.name}`}>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </Field>
              {err ? <p className="text-sm text-fear">{err}</p> : null}
              <ActionButton type="submit" tone="primary">
                Setzen
              </ActionButton>
            </form>
          ) : null}
        </div>
      </div>
    );
  }

  const raised = hands.includes(seated.id);

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <EmberHeader title={seated.name} eyebrow="Sitz" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "karte" ? (
          <div className="h-full min-h-80">
            <Board viewer="player" />
          </div>
        ) : (
          <div className="mx-auto grid max-w-lg gap-4 p-4 pb-8">
            <div className="flex flex-wrap gap-2">
              <ActionButton tone={raised ? "primary" : "ghost"} onClick={() => raiseHand(seated.id)}>
                <Hand className="size-4" />
                {raised ? "Hand sinkt" : "Licht wollen"}
              </ActionButton>
              <ActionButton tone="quiet" onClick={() => sit(null)}>
                Aufstehen
              </ActionButton>
            </div>
            {tab === "wurf" ? <RollPanel characterId={seated.id} /> : <SheetEditor id={seated.id} player />}
          </div>
        )}
      </div>
      <nav className="grid shrink-0 grid-cols-3 border-t border-line bg-surface" aria-label="Sitz">
        {(
          [
            ["bogen", "Bogen", ScrollText],
            ["wurf", "Wurf", Dices],
            ["karte", "Karte", Map],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${tab === id ? "text-gold" : "text-muted"}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
