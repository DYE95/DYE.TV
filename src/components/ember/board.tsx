import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { FOES, type Ink } from "@/lib/ember/rules";
import { useEmber, type Token } from "@/lib/ember/store";
import { ActionButton } from "./chrome";

const RING: Record<Ink, string> = {
  ember: "border-ember text-gold",
  hope: "border-hope text-gold",
  gold: "border-gold text-bg",
  fear: "border-fear text-gold",
  muted: "border-muted text-muted",
};

const FILL: Record<Ink, string> = {
  ember: "bg-ember/25",
  hope: "bg-hope/20",
  gold: "bg-gold/30",
  fear: "bg-fear/20",
  muted: "bg-elevated",
};

type Tool = "move" | "fog" | "place";

export function Board({ viewer }: { viewer: "gm" | "player" }) {
  const tokens = useEmber((s) => s.tokens);
  const fog = useEmber((s) => s.fog);
  const fogOn = useEmber((s) => s.fogOn);
  const initiative = useEmber((s) => s.initiative);
  const seatId = useEmber((s) => s.seatId);
  const moveToken = useEmber((s) => s.moveToken);
  const patchToken = useEmber((s) => s.patchToken);
  const removeToken = useEmber((s) => s.removeToken);
  const addToken = useEmber((s) => s.addToken);
  const addFog = useEmber((s) => s.addFog);
  const removeFog = useEmber((s) => s.removeFog);
  const setFogOn = useEmber((s) => s.setFogOn);
  const stepInitiative = useEmber((s) => s.stepInitiative);
  const seedInitiative = useEmber((s) => s.seedInitiative);

  const boardRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("move");
  const [foeId, setFoeId] = useState<string>(FOES[0].id);
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ id: string; pointer: number } | null>(null);
  const fogDrag = useRef<{ x: number; y: number } | null>(null);
  const [draftFog, setDraftFog] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const gm = viewer === "gm";
  const visible = tokens.filter((token) => gm || !token.hidden);
  const current = initiative.on ? initiative.order[initiative.index] : null;
  const picked = tokens.find((token) => token.id === selected) || null;

  function point(event: { clientX: number; clientY: number }) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }

  function canDrag(token: Token) {
    if (gm) return tool === "move";
    return token.characterId != null && token.characterId === seatId;
  }

  function onTokenDown(event: React.PointerEvent, token: Token) {
    event.stopPropagation();
    setSelected(token.id);
    if (!canDrag(token)) return;
    drag.current = { id: token.id, pointer: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onTokenMove(event: React.PointerEvent) {
    if (!drag.current || drag.current.pointer !== event.pointerId) return;
    const at = point(event);
    moveToken(drag.current.id, at.x, at.y);
  }

  function onTokenUp() {
    drag.current = null;
  }

  function onBoardDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-token]")) return;
    const at = point(event);
    if (!gm) return;
    if (tool === "place") {
      const foe = FOES.find((entry) => entry.id === foeId) || FOES[0];
      addToken({ label: foe.name, kind: "foe", x: at.x, y: at.y, hpMax: foe.hp, ink: "fear" });
      return;
    }
    if (tool === "fog") {
      fogDrag.current = at;
      setDraftFog({ x: at.x, y: at.y, w: 0, h: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
    } else {
      setSelected(null);
    }
  }

  function onBoardMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!fogDrag.current) return;
    const at = point(event);
    const x = Math.min(fogDrag.current.x, at.x);
    const y = Math.min(fogDrag.current.y, at.y);
    setDraftFog({ x, y, w: Math.abs(at.x - fogDrag.current.x), h: Math.abs(at.y - fogDrag.current.y) });
  }

  function onBoardUp() {
    if (draftFog && draftFog.w > 3 && draftFog.h > 3) addFog(draftFog);
    fogDrag.current = null;
    setDraftFog(null);
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {gm ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
          {(
            [
              ["move", "Schieben"],
              ["fog", "Nebel"],
              ["place", "Gegner"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              className={`min-h-11 rounded-lg border px-3 text-sm ${tool === id ? "border-ember text-gold" : "border-line text-muted"}`}
            >
              {label}
            </button>
          ))}
          {tool === "place" ? (
            <select
              aria-label="Gegner"
              value={foeId}
              onChange={(event) => setFoeId(event.target.value)}
              className="min-h-11 rounded-lg border border-line bg-elevated px-2 text-sm"
            >
              {FOES.map((foe) => (
                <option key={foe.id} value={foe.id}>
                  {foe.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => setFogOn(!fogOn)}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm text-muted"
          >
            {fogOn ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {fogOn ? "Nebel an" : "Nebel aus"}
          </button>
        </div>
      ) : null}

      <div
        ref={boardRef}
        className="ember-map relative min-h-0 flex-1"
        onPointerDown={onBoardDown}
        onPointerMove={onBoardMove}
        onPointerUp={onBoardUp}
        onPointerCancel={onBoardUp}
      >
        {(fogOn || gm) &&
          fog.map((rect) => (
            <button
              key={rect.id}
              type="button"
              aria-label="Nebel entfernen"
              disabled={!gm || tool !== "fog"}
              onClick={() => removeFog(rect.id)}
              className="absolute border border-line bg-bg/80"
              style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
            />
          ))}
        {draftFog ? (
          <div
            className="pointer-events-none absolute border border-hope bg-bg/70"
            style={{ left: `${draftFog.x}%`, top: `${draftFog.y}%`, width: `${draftFog.w}%`, height: `${draftFog.h}%` }}
          />
        ) : null}
        {visible.map((token) => {
          const down = token.kind === "foe" && token.hpMax > 0 && token.hp >= token.hpMax;
          const lit = current?.tokenId === token.id;
          return (
            <button
              key={token.id}
              type="button"
              data-token="1"
              aria-label={token.label}
              onPointerDown={(event) => onTokenDown(event, token)}
              onPointerMove={onTokenMove}
              onPointerUp={onTokenUp}
              className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 shadow-lg ${RING[token.ink]} ${FILL[token.ink]} ${token.kind === "mark" ? "size-8" : "size-12"} ${token.hidden ? "opacity-45" : ""} ${lit ? "ring-2 ring-hope" : ""} ${down ? "opacity-50" : ""}`}
              style={{ left: `${token.x}%`, top: `${token.y}%` }}
            >
              <span className={`font-serif text-sm leading-none ${down ? "line-through" : ""}`}>
                {token.label.slice(0, 1)}
              </span>
              <span className="pointer-events-none absolute top-full mt-1 max-w-24 truncate text-[11px] text-fg">
                {token.label}
              </span>
            </button>
          );
        })}
        {current ? (
          <p className="pointer-events-none absolute top-3 left-3 rounded-lg border border-line bg-surface/90 px-3 py-2 font-serif text-sm text-gold">
            Runde {initiative.round} — {current.label}
          </p>
        ) : null}
      </div>

      {gm && picked ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-surface px-3 py-2">
          <p className="min-w-0 flex-1 truncate font-serif text-gold">{picked.label}</p>
          {picked.kind === "foe" ? (
            <ActionButton onClick={() => patchToken(picked.id, { hp: Math.min(picked.hpMax, picked.hp + 1) })}>
              <Plus className="size-4" /> Treffer {picked.hp}/{picked.hpMax}
            </ActionButton>
          ) : null}
          <ActionButton onClick={() => patchToken(picked.id, { hidden: !picked.hidden })}>
            {picked.hidden ? "Zeigen" : "Verbergen"}
          </ActionButton>
          <ActionButton onClick={() => { removeToken(picked.id); setSelected(null); }}>
            <Trash2 className="size-4" />
          </ActionButton>
        </div>
      ) : null}

      {gm ? (
        <div className="flex shrink-0 gap-2 border-t border-line bg-bg px-3 py-2">
          <ActionButton tone="primary" onClick={() => (initiative.order.length ? stepInitiative(1) : seedInitiative())}>
            {initiative.order.length ? "Nächste" : "Reihenfolge"}
          </ActionButton>
          <ActionButton onClick={() => stepInitiative(-1)} disabled={!initiative.order.length}>
            Zurück
          </ActionButton>
        </div>
      ) : null}
    </div>
  );
}
