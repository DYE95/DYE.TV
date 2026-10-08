import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useEmber } from "@/lib/ember/store";

export function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = useEmber.persist.onFinishHydration(() => setReady(true));
    if (useEmber.persist.hasHydrated()) setReady(true);
    else void useEmber.persist.rehydrate();
    return unsub;
  }, []);
  return ready;
}

export function EmberHeader({ title, eyebrow = "Ember" }: { title: string; eyebrow?: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b-2 border-ember bg-surface px-3">
      <Link
        to="/"
        aria-label="Zum Start"
        className="grid size-11 place-items-center rounded-full border border-line bg-elevated text-ember"
      >
        <Flame className="size-5" />
      </Link>
      <div className="min-w-0">
        <p className="truncate font-serif text-lg leading-tight text-gold">{title}</p>
        <p className="truncate text-xs tracking-[0.18em] text-muted uppercase">{eyebrow}</p>
      </div>
    </header>
  );
}

const PIP_ON = {
  hope: "border-hope bg-hope",
  fear: "border-ember bg-ember",
  stress: "border-ember bg-ember",
  armor: "border-gold bg-gold",
} as const;

export function Pips({
  count,
  max,
  tone,
  label,
  onPick,
}: {
  count: number;
  max: number;
  tone: keyof typeof PIP_ON;
  label: string;
  onPick?: (index: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs tracking-[0.14em] text-muted uppercase">{label}</span>
        <span className="font-serif text-sm text-gold">
          {count}/{max}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max }, (_, index) => {
          const on = index < count;
          return (
            <button
              key={index}
              type="button"
              disabled={!onPick}
              aria-label={`${label} ${index + 1}`}
              aria-pressed={on}
              onClick={() => onPick?.(index)}
              className={`size-11 rounded-md border ${on ? PIP_ON[tone] : "border-line bg-elevated"}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs tracking-[0.14em] text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

export const fieldClass =
  "min-h-11 w-full rounded-lg border border-line bg-elevated px-3 text-fg outline-none focus:border-ember";

export function ActionButton({
  children,
  onClick,
  tone = "ghost",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "ghost" | "primary" | "quiet";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const look =
    tone === "primary"
      ? "border-ember bg-elevated text-gold"
      : tone === "quiet"
        ? "border-transparent bg-transparent text-muted"
        : "border-line bg-surface text-fg";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm ${look}`}
    >
      {children}
    </button>
  );
}
