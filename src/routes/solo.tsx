import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ActionButton, EmberHeader, useHydrated } from "@/components/ember/chrome";
import { useEmber } from "@/lib/ember/store";

export const Route = createFileRoute("/solo")({
  component: Solo,
});

function Solo() {
  const ready = useHydrated();
  const solo = useEmber((s) => s.solo);
  const characters = useEmber((s) => s.characters);
  const laySchwelle = useEmber((s) => s.laySchwelle);
  const clearRoom = useEmber((s) => s.clearRoom);
  const [message, setMessage] = useState("");
  const hero = characters.find((character) => character.name === "Ira") || characters[0];

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <EmberHeader title="Solo" eyebrow="Keine Runde" />
      <div className="mx-auto grid max-w-lg gap-4 p-4 pb-16">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h1 className="font-serif text-3xl text-gold">Üben</h1>
          <p className="mt-2 text-sm text-muted">Nicht der Spielabend. Ein Bogen, vier Räume, kein Publikum.</p>
          <div className="mt-4">
            <ActionButton
              tone="primary"
              disabled={!ready}
              onClick={() => {
                const result = laySchwelle();
                setMessage(result.reason);
              }}
            >
              Asche unter der Schwelle
            </ActionButton>
          </div>
          <p className="mt-3 text-sm text-muted">
            {ready ? message || "Der Knopf legt die Kampagne einmal. Eine offene Session bleibt liegen." : "Der Tisch wird gelesen. Der Knopf bleibt."}
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-serif text-xl text-gold">Räume</h2>
          {!ready ? <p className="text-sm text-muted">Räume kommen gleich.</p> : null}
          {ready && !solo.laid ? <p className="text-sm text-muted">Noch nichts gelegt. Die Schwelle wartet auf den Knopf.</p> : null}
          {ready &&
            solo.rooms.map((room, index) => (
              <button
                key={room.id}
                type="button"
                disabled={room.clear}
                onClick={() => {
                  const result = clearRoom(room.id);
                  if (result) setMessage(result.text);
                }}
                className="min-h-14 rounded-xl border border-line bg-elevated px-3 py-2 text-left disabled:opacity-70"
              >
                <span className="block font-serif text-lg text-gold">
                  {room.clear ? "Leer · " : `${index + 1} · `}
                  {room.name}
                </span>
                <span className="text-sm text-muted">
                  {room.bot ? `${room.bot.name} · ${room.bot.difficulty}` : "Durchgang · 10"}
                  {hero ? ` · ${hero.name} Gewandtheit ${hero.traits.agility >= 0 ? "+" : ""}${hero.traits.agility}` : ""}
                </span>
              </button>
            ))}
          {ready && solo.laid && solo.rooms.every((room) => room.clear) ? (
            <p className="text-sm text-hope">Alle Räume leer. Die Stufe sitzt auf dem Bogen.</p>
          ) : null}
        </section>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/tisch" className="text-gold underline decoration-line underline-offset-4">
            An den Tisch
          </Link>
          <Link to="/sitz" className="text-gold underline decoration-line underline-offset-4">
            Zum Sitz
          </Link>
        </div>
      </div>
    </div>
  );
}
