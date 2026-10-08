import { createFileRoute, Link } from "@tanstack/react-router";
import { DoorOpen, Flame, UserRound } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Start,
});

const DOORS = [
  {
    to: "/tisch",
    title: "Die Glut zünden",
    hint: "Spielleitung",
    icon: Flame,
  },
  {
    to: "/sitz",
    title: "Ans Feuer setzen",
    hint: "Eigener Sitz",
    icon: UserRound,
  },
  {
    to: "/solo",
    title: "Unter die Schwelle",
    hint: "Solo, vier Räume",
    icon: DoorOpen,
  },
] as const;

function Start() {
  return (
    <main className="ember-start grid min-h-dvh bg-bg text-fg">
      <section className="flex items-center justify-center px-4 py-8 md:px-8">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface px-5 py-7 shadow-2xl">
          <div className="ember-sigil mx-auto mb-4 size-3.5 rounded-full bg-ember" />
          <h1 className="text-center font-serif text-4xl text-gold">Ember</h1>
          <p className="mt-2 mb-6 text-center text-xs tracking-[0.18em] text-muted uppercase">
            Die Glut am Rand der Umbra
          </p>
          <nav className="grid gap-2" aria-label="Eingänge">
            {DOORS.map((door) => {
              const Icon = door.icon;
              return (
                <Link
                  key={door.to}
                  to={door.to}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-elevated px-3 py-2 text-left hover:border-ember"
                >
                  <Icon className="size-5 shrink-0 text-ember" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-lg text-gold">{door.title}</span>
                    <span className="block text-sm text-muted">{door.hint}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <p className="mt-5 text-sm text-muted">
            Drei Eingänge, auch nach dem Neuladen. Der Tisch bleibt in diesem Browser.
          </p>
        </div>
      </section>
      <figure className="relative hidden min-h-64 overflow-hidden md:block">
        <img
          src="/ember/hearth.jpg"
          alt="Lagerfeuer am Rand der Umbra"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </figure>
      <figure className="relative order-first aspect-video overflow-hidden md:hidden">
        <img
          src="/ember/hearth.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </figure>
    </main>
  );
}
