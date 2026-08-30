"use client";

import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { makeNote, makeStroke } from "@/lib/board";
import { useArena } from "@/lib/store";
import type { Actor, BoardMark, BoardPoint, BoardShape } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tool = "pen" | "note" | "erase";

export function LiveBoard({
  boardIds,
  writeId,
  hint,
}: {
  boardIds: string[];
  writeId: string;
  hint?: string;
}) {
  const marks = useArena(
    useShallow((state) =>
      (state.boardMarks ?? []).filter((mark) => boardIds.includes(mark.decisionId)),
    ),
  );
  const spotlightId = useArena((state) => state.spotlightId);
  const addBoardMark = useArena((state) => state.addBoardMark);
  const updateBoardMark = useArena((state) => state.updateBoardMark);
  const removeBoardMark = useArena((state) => state.removeBoardMark);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("note");
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [draft, setDraft] = useState<BoardPoint[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const sync = () => {
      const box = el.getBoundingClientRect();
      setSize({ w: box.width, h: box.height });
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function toPct(clientX: number, clientY: number): BoardPoint {
    const box = surfaceRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: clampPct(((clientX - box.left) / box.width) * 100),
      y: clampPct(((clientY - box.top) / box.height) * 100),
    };
  }

  function placeNote(clientX: number, clientY: number) {
    const point = toPct(clientX, clientY);
    const mark = makeNote({
      decisionId: writeId,
      text: "",
      x: Math.min(78, point.x),
      y: Math.min(86, point.y),
      author: "founder",
    });
    addBoardMark(mark);
    setEditingId(mark.id);
  }

  function onSurfacePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-mark]")) return;

    if (tool === "note") return;

    if (tool !== "pen") return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* untrusted or unsupported pointers still draw on the element */
    }
    setDraft([toPct(event.clientX, event.clientY)]);
  }

  function onSurfacePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draft) return;
    setDraft((current) =>
      current ? [...current, toPct(event.clientX, event.clientY)] : current,
    );
  }

  function onSurfacePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!draft) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const points = draft.length > 24 ? thin(draft) : draft;
    setDraft(null);
    if (strokeLength(points) < 1.2) return;
    addBoardMark(
      makeStroke({
        decisionId: writeId,
        points,
        author: "founder",
      }),
    );
  }

  const empty = marks.length === 0 && !draft;

  return (
    <section className="border border-rule bg-leaf" data-tool={tool}>
      <header className="sticky top-14 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-paper px-4 py-3">
        <p className="type-eyebrow mr-auto">The table</p>
        <Hand label="You" tone="indigo" />
        <Hand label="Arena" tone="ink" />
        <Hand label="Agent" tone="oxblood" />
        <div className="flex items-center gap-1">
          <ToolButton
            active={tool === "pen"}
            onClick={() => setTool("pen")}
            label="Pen"
          />
          <ToolButton
            active={tool === "note"}
            onClick={() => setTool("note")}
            label="Note"
          />
          <ToolButton
            active={tool === "erase"}
            onClick={() => setTool("erase")}
            label="Scratch"
          />
        </div>
      </header>

      <div
        ref={surfaceRef}
        role="application"
        aria-label="Shared table"
        className={cn(
          "relative min-h-[min(62vh,560px)] overflow-hidden bg-paper paper-grid",
          tool === "pen" && "cursor-crosshair",
          tool === "note" && "cursor-text",
          tool === "erase" && "cursor-cell",
        )}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onSurfacePointerMove}
        onPointerUp={onSurfacePointerUp}
        onPointerCancel={() => setDraft(null)}
        onClick={(event) => {
          if (tool !== "note") return;
          if ((event.target as HTMLElement).closest("[data-mark]")) return;
          placeNote(event.clientX, event.clientY);
        }}
        style={{ touchAction: tool === "pen" ? "none" : "auto" }}
      >
        {empty ? (
          <p className="pointer-events-none absolute inset-0 grid place-items-center px-8 text-center font-display text-[22px] leading-snug text-pencil">
            {hint ??
              "Your pen is indigo. Write or draw. The other side writes in red."}
          </p>
        ) : null}

        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={size.w}
          height={size.h}
        >
          {marks
            .filter((mark) => mark.kind !== "note")
            .map((mark) => (
              <InkMark
                key={mark.id}
                mark={mark}
                width={size.w}
                height={size.h}
                lit={spotlightId === mark.id}
              />
            ))}
          {draft ? (
            <polyline
              points={draft
                .map((point) => `${(point.x / 100) * size.w},${(point.y / 100) * size.h}`)
                .join(" ")}
              fill="none"
              stroke="var(--indigo)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "url(#ink-rough)" }}
            />
          ) : null}
        </svg>

        {marks
          .filter((mark) => mark.kind === "note")
          .map((mark) => (
            <NoteMark
              key={mark.id}
              mark={mark}
              tool={tool}
              editing={editingId === mark.id}
              lit={spotlightId === mark.id}
              onEdit={() => setEditingId(mark.id)}
              onBlur={() => {
                if (editingId === mark.id) setEditingId(null);
              }}
              onChange={(text) => updateBoardMark(mark.id, { text })}
              onMove={(x, y) => updateBoardMark(mark.id, { x, y })}
              onErase={() => removeBoardMark(mark.id)}
            />
          ))}

        {tool === "erase"
          ? marks
              .filter((mark) => mark.kind !== "note")
              .map((mark) => (
                <button
                  key={`erase-${mark.id}`}
                  type="button"
                  data-mark={mark.id}
                  aria-label="Scratch out this mark"
                  className="absolute z-10 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full hover:bg-oxblood-wash"
                  style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    removeBoardMark(mark.id);
                  }}
                />
              ))
          : null}
      </div>
    </section>
  );
}

function InkMark({
  mark,
  width,
  height,
  lit,
}: {
  mark: BoardMark;
  width: number;
  height: number;
  lit: boolean;
}) {
  const color = inkColor(mark.author);
  const x = (mark.x / 100) * width;
  const y = (mark.y / 100) * height;
  const w = ((mark.w ?? 16) / 100) * width;
  const h = ((mark.h ?? 12) / 100) * height;

  if (mark.kind === "stroke" && mark.points?.length) {
    return (
      <polyline
        points={mark.points
          .map((point) => `${(point.x / 100) * width},${(point.y / 100) * height}`)
          .join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={lit ? 3 : 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={lit ? "ink-draw" : undefined}
        style={{ filter: "url(#ink-rough)" }}
      />
    );
  }

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={lit ? "ink-draw" : undefined}
      style={{ filter: "url(#ink-rough)" }}
    >
      <ShapePath shape={mark.shape ?? "scribble"} w={w} h={h} color={color} />
    </g>
  );
}

function ShapePath({
  shape,
  w,
  h,
  color,
}: {
  shape: BoardShape;
  w: number;
  h: number;
  color: string;
}) {
  const sw = 2.1;
  if (shape === "circle") {
    return (
      <ellipse
        cx={w / 2}
        cy={h / 2}
        rx={w / 2}
        ry={h / 2}
        fill="none"
        stroke={color}
        strokeWidth={sw}
      />
    );
  }
  if (shape === "underline") {
    return (
      <path
        d={`M 0 ${h * 0.7} Q ${w * 0.35} ${h} ${w * 0.55} ${h * 0.62} T ${w} ${h * 0.78}`}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    );
  }
  if (shape === "cross") {
    return (
      <>
        <path d={`M 0 0 L ${w} ${h}`} stroke={color} strokeWidth={sw} strokeLinecap="round" />
        <path d={`M ${w} 0 L 0 ${h}`} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      </>
    );
  }
  if (shape === "check") {
    return (
      <path
        d={`M ${w * 0.12} ${h * 0.52} L ${w * 0.38} ${h * 0.82} L ${w * 0.9} ${h * 0.18}`}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (shape === "arrow") {
    return (
      <>
        <path
          d={`M 0 ${h * 0.5} L ${w * 0.78} ${h * 0.5}`}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M ${w * 0.62} ${h * 0.18} L ${w} ${h * 0.5} L ${w * 0.62} ${h * 0.82}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }
  return (
    <path
      d={`M 0 ${h * 0.45} C ${w * 0.2} 0, ${w * 0.4} ${h}, ${w * 0.55} ${h * 0.4} S ${w * 0.85} ${h * 0.1}, ${w} ${h * 0.55}`}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
    />
  );
}

function NoteMark({
  mark,
  tool,
  editing,
  lit,
  onEdit,
  onBlur,
  onChange,
  onMove,
  onErase,
}: {
  mark: BoardMark;
  tool: Tool;
  editing: boolean;
  lit: boolean;
  onEdit: () => void;
  onBlur: () => void;
  onChange: (text: string) => void;
  onMove: (x: number, y: number) => void;
  onErase: () => void;
}) {
  const drag = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) areaRef.current?.focus();
  }, [editing]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (tool === "erase") {
      onErase();
      return;
    }
    if ((event.target as HTMLElement).tagName === "TEXTAREA") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: mark.x,
      originY: mark.y,
      moved: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const board = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!board) return;
    const dx = event.clientX - drag.current.startX;
    const dy = event.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    onMove(
      clampPct(drag.current.originX + (dx / board.width) * 100),
      clampPct(drag.current.originY + (dy / board.height) * 100),
    );
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const wasDrag = drag.current?.moved;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!wasDrag && tool !== "erase") onEdit();
  }

  return (
    <div
      data-mark={mark.id}
      className={cn(
        "absolute z-20 w-[min(28%,240px)] min-w-[140px] cursor-grab active:cursor-grabbing",
        lit && "stamp-in",
      )}
      style={{
        left: `${mark.x}%`,
        top: `${mark.y}%`,
        transform: `rotate(${tilt(mark.id)}deg)`,
        color: inkColor(mark.author),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <textarea
        ref={areaRef}
        value={mark.text ?? ""}
        readOnly={tool === "erase"}
        rows={Math.max(2, Math.min(8, (mark.text ?? "").split("\n").length + 1))}
        placeholder={mark.author === "founder" ? "Write it." : ""}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onEdit}
        onBlur={onBlur}
        className="type-display w-full resize-none bg-transparent p-1 text-[17px] leading-snug shadow-none outline-none placeholder:text-pencil"
        style={{ color: "inherit" }}
      />
    </div>
  );
}

function Hand({
  label,
  tone,
}: {
  label: string;
  tone: "indigo" | "oxblood" | "ink";
}) {
  const color =
    tone === "indigo"
      ? "var(--indigo)"
      : tone === "oxblood"
        ? "var(--oxblood)"
        : "var(--ink)";
  return (
    <span className="type-eyebrow inline-flex items-center gap-1.5">
      <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
        <path
          d="M3 12 Q 6 4, 13 7"
          fill="none"
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
          style={{ filter: "url(#ink-rough)" }}
        />
      </svg>
      <span
        className={
          tone === "indigo"
            ? "text-indigo"
            : tone === "oxblood"
              ? "text-oxblood"
              : "text-ink"
        }
      >
        {label}
      </span>
    </span>
  );
}

function ToolButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "type-eyebrow px-2 py-1",
        active ? "bg-ink text-paper" : "text-graphite hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function inkColor(author: Actor) {
  if (author === "founder") return "var(--indigo)";
  if (author === "agent") return "var(--oxblood)";
  return "var(--ink)";
}

function tilt(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n += id.charCodeAt(i);
  return ((n % 7) - 3) * 0.65;
}

function clampPct(value: number) {
  return Math.max(1, Math.min(96, value));
}

function strokeLength(points: BoardPoint[]) {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.hypot(dx, dy);
  }
  return length;
}

function thin(points: BoardPoint[]) {
  return points.filter((_, index) => index % 2 === 0 || index === points.length - 1);
}
