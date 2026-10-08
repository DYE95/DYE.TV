import { createFileRoute } from "@tanstack/react-router";
import { Dices, Flame, Map, ScrollText } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Board } from "@/components/ember/board";
import { ActionButton, EmberHeader, Field, Pips, fieldClass, useHydrated } from "@/components/ember/chrome";
import { RollPanel } from "@/components/ember/roll-panel";
import { Roster } from "@/components/ember/roster";
import { nextCount } from "@/lib/ember/rules";
import { useEmber } from "@/lib/ember/store";

export const Route = createFileRoute("/tisch")({
  component: Tisch,
});

type Tab = "glut" | "karte" | "bogen" | "wurf";

function Tisch() {
  const ready = useHydrated();
  const [tab, setTab] = useState<Tab>("glut");
  const name = useEmber((s) => s.campaign.name);

  if (!ready) {
    return (
      <div className="flex h-dvh flex-col bg-bg text-fg">
        <EmberHeader title="Die Glut" eyebrow="Spielleitung" />
        <p className="p-6 text-muted">Die Glut wird gelesen …</p>
      </div>
    );
  }

  const aside = tab === "bogen" ? <Roster /> : tab === "wurf" ? <RollPanel /> : <Glut />;

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <EmberHeader title={name || "Die Glut"} eyebrow="Spielleitung" />
      <div className="flex min-h-0 flex-1">
        <section className={`${tab === "karte" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col md:flex`}>
          <Board viewer="gm" />
        </section>
        <aside className={`${tab === "karte" ? "hidden" : "block"} min-h-0 w-full overflow-y-auto md:block md:w-96 md:shrink-0 md:border-l md:border-line`}>
          <div className="sticky top-0 z-10 hidden gap-2 border-b border-line bg-surface p-2 md:flex">
            <SideTab on={tab === "glut" || tab === "karte"} onClick={() => setTab("glut")}>
              Glut
            </SideTab>
            <SideTab on={tab === "bogen"} onClick={() => setTab("bogen")}>
              Bögen
            </SideTab>
            <SideTab on={tab === "wurf"} onClick={() => setTab("wurf")}>
              Wurf
            </SideTab>
          </div>
          <div className="p-4 pb-8">{aside}</div>
        </aside>
      </div>
      <nav className="grid shrink-0 grid-cols-4 border-t border-line bg-surface md:hidden" aria-label="Tisch">
        <TabButton tab="glut" current={tab} setTab={setTab} icon={<Flame className="size-4" />} label="Glut" />
        <TabButton tab="karte" current={tab} setTab={setTab} icon={<Map className="size-4" />} label="Karte" />
        <TabButton tab="bogen" current={tab} setTab={setTab} icon={<ScrollText className="size-4" />} label="Bögen" />
        <TabButton tab="wurf" current={tab} setTab={setTab} icon={<Dices className="size-4" />} label="Wurf" />
      </nav>
    </div>
  );
}

function SideTab({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-lg border text-sm ${on ? "border-ember text-gold" : "border-line text-muted"}`}
    >
      {children}
    </button>
  );
}

function TabButton({
  tab,
  current,
  setTab,
  icon,
  label,
}: {
  tab: Tab;
  current: Tab;
  setTab: (tab: Tab) => void;
  icon: ReactNode;
  label: string;
}) {
  const on = current === tab;
  return (
    <button
      type="button"
      onClick={() => setTab(tab)}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${on ? "text-gold" : "text-muted"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function Glut() {
  const campaign = useEmber((s) => s.campaign);
  const initiative = useEmber((s) => s.initiative);
  const hands = useEmber((s) => s.hands);
  const characters = useEmber((s) => s.characters);
  const log = useEmber((s) => s.log);
  const setCampaignName = useEmber((s) => s.setCampaignName);
  const setNotes = useEmber((s) => s.setNotes);
  const setFear = useEmber((s) => s.setFear);
  const seedInitiative = useEmber((s) => s.seedInitiative);
  const stepInitiative = useEmber((s) => s.stepInitiative);
  const focusRow = useEmber((s) => s.focusRow);
  const toggleAuto = useEmber((s) => s.toggleAuto);
  const giveLight = useEmber((s) => s.giveLight);
  const note = useEmber((s) => s.note);
  const resetTable = useEmber((s) => s.resetTable);
  const [line, setLine] = useState("");
  const who = initiative.on ? initiative.order[initiative.index] : null;

  return (
    <div className="grid gap-5">
      <Field label="Kampagne">
        <input className={fieldClass} value={campaign.name} onChange={(event) => setCampaignName(event.target.value)} />
      </Field>
      <p className="text-sm text-muted">{campaign.frame}</p>
      <Pips
        label="Fear"
        tone="fear"
        count={campaign.fear}
        max={campaign.fearMax}
        onPick={(index) => setFear(nextCount(campaign.fear, index, campaign.fearMax))}
      />
      <p className="text-sm text-muted">Uhr {campaign.clock}. Sie schlägt, wenn Fear überläuft.</p>

      {hands.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs tracking-[0.14em] text-muted uppercase">Hände</p>
          {hands.map((id) => {
            const character = characters.find((entry) => entry.id === id);
            return (
              <ActionButton key={id} tone="primary" onClick={() => giveLight(id)}>
                {character?.name || "Jemand"} will das Licht
              </ActionButton>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">Noch niemand hebt die Hand.</p>
      )}

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-xs tracking-[0.14em] text-muted uppercase">Reihenfolge</p>
          <button type="button" className="text-sm text-muted" onClick={toggleAuto}>
            {initiative.auto ? "Auto an" : "Auto aus"}
          </button>
        </div>
        {who ? <p className="font-serif text-gold">Runde {initiative.round} — {who.label} ist dran.</p> : null}
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="primary" onClick={seedInitiative}>
            Neu legen
          </ActionButton>
          <ActionButton onClick={() => stepInitiative(-1)} disabled={!initiative.order.length}>
            Zurück
          </ActionButton>
          <ActionButton onClick={() => stepInitiative(1)} disabled={!initiative.order.length}>
            Weiter
          </ActionButton>
        </div>
        <ul className="grid gap-1">
          {initiative.order.map((row, index) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => focusRow(row.id)}
                className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-sm ${index === initiative.index && initiative.on ? "border-ember text-gold" : "border-line"}`}
              >
                <span>{row.label}</span>
                <span className="text-xs text-muted">{row.kind === "pc" ? "Sitz" : row.kind === "foe" ? "Gegner" : "SL"}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          note(line);
          setLine("");
        }}
      >
        <input className={fieldClass} value={line} placeholder="Ins Log" onChange={(event) => setLine(event.target.value)} />
        <ActionButton type="submit">Notieren</ActionButton>
      </form>
      <div className="grid max-h-64 gap-2 overflow-y-auto">
        {log.length === 0 ? <p className="text-sm text-muted">Das Log ist noch still.</p> : null}
        {log.map((entry) => (
          <p key={entry.id} className={`text-sm ${entry.kind === "roll" ? "text-fg" : "text-muted"}`}>
            {entry.text}
          </p>
        ))}
      </div>

      <Field label="Notizen zur Runde">
        <textarea className={`${fieldClass} min-h-24 py-2`} value={campaign.notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>

      <ActionButton
        tone="quiet"
        onClick={() => {
          if (window.confirm("Den Tisch in diesem Browser leeren? Bögen, Karte und die Schwelle gehen mit.")) resetTable();
        }}
      >
        Tisch leeren
      </ActionButton>
    </div>
  );
}
