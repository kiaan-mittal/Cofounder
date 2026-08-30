"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { PerspectiveEmblem } from "@/components/ink/emblems";
import { makeDrawing, makeNote, makeStroke } from "@/lib/board";
import {
  CANVAS_ROOT,
  defaultLinkKind,
  makeCanvasLink,
  makeCanvasNode,
  nextClaimSeat,
  treeLayout,
} from "@/lib/canvas-model";
import {
  PERSPECTIVES,
  perspectiveSeat,
  seatToPerspective,
} from "@/lib/perspectives";
import { useArena } from "@/lib/store";
import type {
  Actor,
  BoardMark,
  BoardPoint,
  CanvasKind,
  CanvasNode,
  PerspectiveId,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Tool =
  | "select"
  | "claim"
  | "evidence"
  | "risk"
  | "assumption"
  | "pen"
  | "circle"
  | "box"
  | "text"
  | "connect"
  | "scratch";

type ShapeDraft = {
  shape: "circle" | "box";
  x: number;
  y: number;
  w: number;
  h: number;
};

const KIND_TOOLS: Array<Extract<Tool, CanvasKind>> = [
  "claim",
  "evidence",
  "risk",
  "assumption",
];

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;

const SHEETS = [
  { id: "s", label: "S", extent: 1, frame: "min(68vh,620px)" },
  { id: "m", label: "M", extent: 1.6, frame: "min(80vh,800px)" },
  { id: "l", label: "L", extent: 2.2, frame: "min(90vh,960px)" },
] as const;

const COMPACT_SHEETS = [
  { id: "s", label: "S", extent: 1, frame: "min(42vh,380px)" },
  { id: "m", label: "M", extent: 1.45, frame: "min(52vh,480px)" },
  { id: "l", label: "L", extent: 2, frame: "min(64vh,600px)" },
] as const;

export function DecisionCanvas({
  boardIds,
  writeId,
  title,
  confidence,
  onHandoff,
  onTitleChange,
  compact = false,
}: {
  boardIds: string[];
  writeId: string;
  title: string;
  confidence: number | null;
  onHandoff?: (node: CanvasNode) => void;
  onTitleChange?: (title: string) => void;
  compact?: boolean;
}) {
  const nodes = useArena(
    useShallow((state) =>
      (state.canvasNodes ?? []).filter((node) =>
        boardIds.includes(node.decisionId),
      ),
    ),
  );
  const links = useArena(
    useShallow((state) =>
      (state.canvasLinks ?? []).filter((link) =>
        boardIds.includes(link.decisionId),
      ),
    ),
  );
  const marks = useArena(
    useShallow((state) =>
      (state.boardMarks ?? []).filter((mark) =>
        boardIds.includes(mark.decisionId),
      ),
    ),
  );
  const spotlightId = useArena((state) => state.spotlightId);
  const handoff = useArena((state) => state.handoff);
  const addNode = useArena((state) => state.addCanvasNode);
  const updateNode = useArena((state) => state.updateCanvasNode);
  const removeNode = useArena((state) => state.removeCanvasNode);
  const addLink = useArena((state) => state.addCanvasLink);
  const addMark = useArena((state) => state.addBoardMark);
  const updateMark = useArena((state) => state.updateBoardMark);
  const removeMark = useArena((state) => state.removeBoardMark);

  const viewportRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [view, setView] = useState({ w: 1, h: 1 });
  const [sheet, setSheet] = useState(1);
  const [camera, setCamera] = useState({ zoom: 1, x: 0, y: 0 });
  const [draft, setDraft] = useState<BoardPoint[] | null>(null);
  const [shapeDraft, setShapeDraft] = useState<ShapeDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const tidiedFor = useRef<string | null>(null);
  const spaceHeld = useRef(false);
  const overBoard = useRef(false);
  const panDrag = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const cameraRef = useRef(camera);
  const viewRef = useRef(view);
  const sizeRef = useRef({ w: 1, h: 1 });
  cameraRef.current = camera;
  viewRef.current = view;

  const sheets = compact ? COMPACT_SHEETS : SHEETS;
  const measured = view.w > 8 && view.h > 8;
  const extent = sheets[sheet].extent;
  const size = {
    w: Math.max(1, measured ? view.w * extent : view.w),
    h: Math.max(1, measured ? view.h * extent : view.h),
  };
  sizeRef.current = size;

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let frame = 0;
    const sync = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 8 || h < 8) {
        frame = requestAnimationFrame(sync);
        return;
      }
      setView((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [sheet]);

  const bindViewport = useCallback((el: HTMLDivElement | null) => {
    viewportRef.current = el;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w < 8 || h < 8) return;
    setView((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  const lastSheet = useRef<number | null>(null);
  useEffect(() => {
    if (view.w <= 8) return;
    if (lastSheet.current === sheet) return;
    lastSheet.current = sheet;
    setCamera((cam) => ({
      ...cam,
      x: (view.w - view.w * sheets[sheet].extent * cam.zoom) / 2,
      y: 0,
    }));
  }, [sheet, view.w]);

  useEffect(() => {
    if (!nodes.length || tidiedFor.current === writeId) return;
    const hasKids = nodes.some((node) => node.kind !== "claim");
    if (hasKids && links.length === 0) return;
    tidiedFor.current = writeId;
    for (const patch of treeLayout(nodes, links)) {
      const current = nodes.find((node) => node.id === patch.id);
      if (!current || (current.x === patch.x && current.y === patch.y)) continue;
      updateNode(patch.id, { x: patch.x, y: patch.y });
    }
  }, [writeId, nodes, links, updateNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size.w * (window.devicePixelRatio || 1);
    canvas.height = size.h * (window.devicePixelRatio || 1);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = window.devicePixelRatio || 1;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    const drawing =
      tool === "pen" || tool === "circle" || tool === "box" || tool === "scratch";
    ctx.globalAlpha = drawing ? 1 : 0.28;
    for (const mark of marks) {
      if (mark.kind === "stroke") paintMark(ctx, mark, size);
    }
    ctx.globalAlpha = 1;
    if (draft) paintStroke(ctx, draft, size, "var(--indigo)");
    if (shapeDraft) {
      paintShape(
        ctx,
        shapeDraft.shape,
        shapeDraft,
        size,
        "var(--indigo)",
      );
    }
  }, [marks, draft, shapeDraft, size, tool]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = el.getBoundingClientRect();
      const origin = {
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      };
      if (event.ctrlKey || event.metaKey) {
        const next = cameraRef.current.zoom * Math.exp(-event.deltaY * 0.01);
        zoomTo(next, origin);
        return;
      }
      setCamera((cam) => ({
        ...cam,
        x: cam.x - event.deltaX,
        y: cam.y - event.deltaY,
      }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const isField = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.isContentEditable
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !isField(event.target) && overBoard.current) {
        spaceHeld.current = true;
        event.preventDefault();
      }
      if (isField(event.target) || !overBoard.current) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(ZOOM_STEP);
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(-ZOOM_STEP);
      }
      if (event.key === "0") {
        event.preventDefault();
        resetCamera();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") spaceHeld.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function toPct(clientX: number, clientY: number): BoardPoint {
    const box = viewportRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    const { zoom, x: panX, y: panY } = cameraRef.current;
    return {
      x: clampPct(((clientX - box.left - panX) / zoom / size.w) * 100),
      y: clampPct(((clientY - box.top - panY) / zoom / size.h) * 100),
    };
  }

  function zoomTo(nextZoom: number, origin?: { x: number; y: number }) {
    const box = viewportRef.current?.getBoundingClientRect();
    const ox = origin?.x ?? (box?.width ?? view.w) / 2;
    const oy = origin?.y ?? (box?.height ?? view.h) / 2;
    setCamera((cam) => {
      const zoom = clampZoom(nextZoom);
      const wx = (ox - cam.x) / cam.zoom;
      const wy = (oy - cam.y) / cam.zoom;
      return { zoom, x: ox - wx * zoom, y: oy - wy * zoom };
    });
  }

  function zoomBy(delta: number, origin?: { x: number; y: number }) {
    zoomTo(cameraRef.current.zoom + delta, origin);
  }

  function resetCamera() {
    const nextView = viewRef.current;
    const nextSize = sizeRef.current;
    setCamera({
      zoom: 1,
      x: (nextView.w - nextSize.w) / 2,
      y: 0,
    });
  }

  function fitCamera() {
    const xs = [50, ...nodes.map((node) => node.x)];
    const ys = [8, ...nodes.map((node) => node.y)];
    const minX = Math.min(...xs) - 8;
    const maxX = Math.max(...xs) + 20;
    const minY = Math.min(...ys) - 6;
    const maxY = Math.max(...ys) + 18;
    const bw = Math.max(24, maxX - minX) / 100 * size.w;
    const bh = Math.max(24, maxY - minY) / 100 * size.h;
    const zoom = clampZoom(Math.min(view.w / bw, view.h / bh) * 0.92);
    const cx = ((minX + maxX) / 2 / 100) * size.w;
    const cy = ((minY + maxY) / 2 / 100) * size.h;
    setCamera({
      zoom,
      x: view.w / 2 - cx * zoom,
      y: view.h / 2 - cy * zoom,
    });
  }

  function placeNode(kind: CanvasKind, x: number, y: number) {
    const node = makeCanvasNode({
      decisionId: writeId,
      kind,
      text: "",
      x: Math.min(78, x),
      y: Math.min(82, y),
      author: "founder",
    });
    addNode(node);
    if (kind === "claim") {
      addLink(
        makeCanvasLink({
          decisionId: writeId,
          fromId: CANVAS_ROOT,
          toId: node.id,
          kind: "supports",
          author: "founder",
        }),
      );
    }
    setSelectedId(node.id);
    setEditingId(node.id);
  }

  function beginPan(event: React.PointerEvent<HTMLDivElement>) {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* still pan */
    }
    panDrag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: cameraRef.current.x,
      originY: cameraRef.current.y,
      moved: false,
    };
    setPanning(true);
  }

  function onSurfacePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button === 1) {
      event.preventDefault();
      beginPan(event);
      return;
    }
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-node]")) return;
    if (
      tool !== "pen" &&
      tool !== "circle" &&
      tool !== "box" &&
      target.closest("[data-mark]")
    ) {
      return;
    }

    if (spaceHeld.current || tool === "select") {
      beginPan(event);
      return;
    }

    const point = toPct(event.clientX, event.clientY);

    if (tool === "text") {
      const note = makeNote({
        decisionId: writeId,
        text: "",
        x: Math.min(78, point.x),
        y: Math.min(82, point.y),
        author: "founder",
      });
      addMark({ ...note, w: 16, h: 10 });
      setSelectedId(note.id);
      setTool("select");
      return;
    }

    if (KIND_TOOLS.includes(tool as (typeof KIND_TOOLS)[number])) {
      placeNode(tool as CanvasKind, point.x, point.y);
      return;
    }

    if (tool === "scratch") {
      const hit = hitMark(marks, point);
      if (hit) removeMark(hit.id);
      return;
    }

    if (tool === "pen") {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* still draw */
      }
      setDraft([point]);
      return;
    }

    if (tool === "circle" || tool === "box") {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* still draw */
      }
      setShapeDraft({ shape: tool, x: point.x, y: point.y, w: 2, h: 2 });
    }
  }

  function onSurfacePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (panDrag.current) {
      const dx = event.clientX - panDrag.current.startX;
      const dy = event.clientY - panDrag.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) panDrag.current.moved = true;
      setCamera({
        zoom: cameraRef.current.zoom,
        x: panDrag.current.originX + dx,
        y: panDrag.current.originY + dy,
      });
      return;
    }
    const point = toPct(event.clientX, event.clientY);
    if (draft) {
      setDraft((current) => (current ? [...current, point] : current));
    }
    if (shapeDraft) {
      setShapeDraft((current) =>
        current
          ? {
              ...current,
              w: Math.max(2, point.x - current.x),
              h: Math.max(2, point.y - current.y),
            }
          : current,
      );
    }
  }

  function onSurfacePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (panDrag.current) {
      const wasDrag = panDrag.current.moved;
      panDrag.current = null;
      setPanning(false);
      if (!wasDrag && tool === "select" && !spaceHeld.current) {
        setSelectedId(null);
        setEditingId(null);
      }
      return;
    }
    if (draft) {
      const points = draft.length > 24 ? draft.filter((_, i) => i % 2 === 0) : draft;
      setDraft(null);
      if (strokeLength(points) >= 1.2) {
        addMark(makeStroke({ decisionId: writeId, points, author: "founder" }));
      }
    }
    if (shapeDraft) {
      const next = shapeDraft;
      setShapeDraft(null);
      if (next.w > 3 && next.h > 3) {
        const drawing = makeDrawing({
          decisionId: writeId,
          shape: next.shape,
          x: next.x,
          y: next.y,
          w: next.w,
          h: next.h,
          author: "founder",
        });
        addMark(drawing);
        setSelectedId(drawing.id);
        setTool("select");
      }
    }
  }

  function onNodeActivate(node: CanvasNode) {
    if (tool === "scratch") {
      removeNode(node.id);
      setSelectedId(null);
      return;
    }
    if (tool === "connect") {
      if (!connectFrom) {
        setConnectFrom(node.id);
        setSelectedId(node.id);
        return;
      }
      if (connectFrom !== node.id) {
        const from = nodes.find((item) => item.id === connectFrom);
        addLink(
          makeCanvasLink({
            decisionId: writeId,
            fromId: connectFrom,
            toId: node.id,
            kind: defaultLinkKind(from?.kind ?? "claim", node.kind),
            author: "founder",
          }),
        );
      }
      setConnectFrom(null);
      setSelectedId(node.id);
      return;
    }
    setSelectedId(node.id);
    setEditingId(node.id);
  }

  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const selectedMark = marks.find((mark) => mark.id === selectedId) ?? null;

  return (
    <section className="border border-rule bg-leaf">
      <header className="sticky top-14 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule bg-paper px-3 py-2.5">
        <p className="type-eyebrow mr-auto">Decision canvas</p>
        <Hand label="You" tone="indigo" />
        <Hand label="Arena" tone="ink" />
        <Hand label="Agent" tone="oxblood" />
        <div className="flex flex-wrap items-center gap-0.5">
          {(
            [
              ["select", "Select"],
              ["claim", "Claim"],
              ["evidence", "Evidence"],
              ["risk", "Risk"],
              ["assumption", "Assumption"],
              ["text", "Text"],
              ["pen", "Pen"],
              ["circle", "Circle"],
              ["box", "Box"],
              ["connect", "Link"],
              ["scratch", "Scratch"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tool === id}
              onClick={() => {
                setTool(id);
                if (id !== "connect") setConnectFrom(null);
              }}
              className={cn(
                "type-eyebrow px-2 py-1",
                tool === id ? "bg-ink text-paper" : "text-graphite hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="type-eyebrow px-2 py-1 text-graphite hover:text-ink"
            onClick={() => {
              for (const patch of treeLayout(nodes, links)) {
                updateNode(patch.id, { x: patch.x, y: patch.y });
              }
            }}
          >
            Tidy
          </button>
        </div>
      </header>

      <SeatRail nodes={nodes} />

      <div
        ref={bindViewport}
        role="application"
        aria-label="Decision canvas"
        className={cn(
          "relative overflow-hidden bg-leaf",
          panning || spaceHeld.current
            ? "cursor-grabbing"
            : tool === "pen" || tool === "circle" || tool === "box" || tool === "text"
              ? "cursor-crosshair"
              : tool === "select"
                ? "cursor-grab"
                : null,
          tool === "connect" && "cursor-alias",
        )}
        style={{
          minHeight: sheets[sheet].frame,
          touchAction: "none",
        }}
        onPointerEnter={() => {
          overBoard.current = true;
        }}
        onPointerLeave={() => {
          overBoard.current = false;
        }}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onSurfacePointerMove}
        onPointerUp={onSurfacePointerUp}
        onAuxClick={(event) => event.preventDefault()}
        onPointerCancel={() => {
          panDrag.current = null;
          setPanning(false);
          setDraft(null);
          setShapeDraft(null);
        }}
      >
        <div
          ref={surfaceRef}
          className="absolute left-0 top-0 origin-top-left bg-paper paper-grid"
          style={{
            width: measured ? size.w : "100%",
            height: measured ? size.h : "100%",
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          }}
        >
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={size.w}
          height={size.h}
        >
          <defs>
            <marker
              id="canvas-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--graphite)" />
            </marker>
          </defs>
          {links.map((link) => (
            <LinkPath
              key={link.id}
              link={link}
              nodes={nodes}
              size={size}
              lit={spotlightId === link.id}
            />
          ))}
        </svg>

        <DecisionRoot
          title={title}
          confidence={confidence}
          selected={selectedId === CANVAS_ROOT}
          connecting={connectFrom === CANVAS_ROOT}
          onTitleChange={onTitleChange}
          onSelect={() => {
            if (tool === "connect") {
              if (connectFrom && connectFrom !== CANVAS_ROOT) {
                const from = nodes.find((item) => item.id === connectFrom);
                addLink(
                  makeCanvasLink({
                    decisionId: writeId,
                    fromId: connectFrom,
                    toId: CANVAS_ROOT,
                    kind: defaultLinkKind(from?.kind ?? "claim", "decision"),
                    author: "founder",
                  }),
                );
                setConnectFrom(null);
              } else {
                setConnectFrom(CANVAS_ROOT);
              }
            }
            setSelectedId(CANVAS_ROOT);
          }}
        />

        {nodes.length === 0 && marks.length === 0 ? (
          <p className="pointer-events-none absolute inset-x-8 top-[42%] text-center font-display text-[20px] leading-snug text-pencil">
            Drop a claim. They will write on the same map.
          </p>
        ) : null}

        {marks.map((mark) => (
          <MarkObject
            key={mark.id}
            mark={mark}
            zoom={camera.zoom}
            tool={tool}
            selected={selectedId === mark.id}
            onSelect={() => {
              if (tool === "scratch") {
                removeMark(mark.id);
                setSelectedId(null);
                return;
              }
              setSelectedId(mark.id);
            }}
            onMove={(x, y, points) =>
              updateMark(mark.id, points ? { x, y, points } : { x, y })
            }
            onChange={(text) => updateMark(mark.id, { text })}
          />
        ))}

        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            zoom={camera.zoom}
            tool={tool}
            selected={selectedId === node.id}
            connecting={connectFrom === node.id}
            editing={editingId === node.id}
            lit={spotlightId === node.id}
            onActivate={() => onNodeActivate(node)}
            onEdit={() => setEditingId(node.id)}
            onChange={(text) => updateNode(node.id, { text })}
            onMove={(x, y) => updateNode(node.id, { x, y })}
          />
        ))}
        </div>

        <CameraWell
          zoom={camera.zoom}
          sheet={sheet}
          onZoomOut={() => zoomBy(-ZOOM_STEP)}
          onZoomIn={() => zoomBy(ZOOM_STEP)}
          onReset={resetCamera}
          onFit={fitCamera}
          onSheet={setSheet}
        />
      </div>

      {handoff?.status === "working" ? (
        <p className="border-t border-rule bg-oxblood-wash px-4 py-3 text-[13.5px] text-ink">
          Challenge accepted. Re-evaluating…
        </p>
      ) : handoff?.status === "returned" && handoff.returnedText ? (
        <p className="border-t border-rule bg-paper px-4 py-3 text-[13.5px] text-ink">
          <span className="type-eyebrow text-oxblood">Returned · </span>
          {handoff.returnedText}
        </p>
      ) : selectedMark ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-rule bg-paper px-4 py-3">
          <p className="type-eyebrow text-ink">
            {selectedMark.kind === "note"
              ? "Text"
              : selectedMark.shape === "circle"
                ? "Circle"
                : selectedMark.kind === "stroke"
                  ? "Ink"
                  : "Box"}
          </p>
          <p className="min-w-0 flex-1 text-[13.5px] text-graphite">
            Drag to move. Scratch to erase.
          </p>
        </div>
      ) : selected && selectedId !== CANVAS_ROOT ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-rule bg-paper px-4 py-3">
          <p className="type-eyebrow text-ink">{selected.kind}</p>
          <p className="min-w-0 flex-1 truncate text-[14px] text-graphite">
            {selected.text || "Empty."}
          </p>
          {onHandoff ? (
            <button
              type="button"
              className="type-eyebrow border border-rule px-3 py-1.5 text-ink hover:bg-leaf"
              onClick={() => onHandoff(selected)}
            >
              Hand off
            </button>
          ) : null}
          <button
            type="button"
            className="type-eyebrow text-graphite hover:text-ink"
            onClick={() => {
              setTool("connect");
              setConnectFrom(selected.id);
            }}
          >
            Link
          </button>
        </div>
      ) : connectFrom ? (
        <p className="border-t border-rule bg-paper px-4 py-3 text-[13.5px] text-graphite">
          Click the node this counters or supports.
        </p>
      ) : null}
    </section>
  );
}

function DecisionRoot({
  title,
  confidence,
  selected,
  connecting,
  onSelect,
  onTitleChange,
}: {
  title: string;
  confidence: number | null;
  selected: boolean;
  connecting: boolean;
  onSelect: () => void;
  onTitleChange?: (title: string) => void;
}) {
  return (
    <div
      data-node={CANVAS_ROOT}
      className={cn(
        "absolute left-1/2 top-[5%] z-20 w-[min(48%,320px)] -translate-x-1/2 border bg-paper px-4 py-3 text-center",
        selected || connecting ? "border-ink" : "border-rule",
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onSelect}
    >
      <p className="type-eyebrow">Decision</p>
      {onTitleChange ? (
        <textarea
          value={title}
          rows={2}
          placeholder="What are you deciding?"
          onChange={(event) => onTitleChange(event.target.value)}
          className="type-display mt-1 w-full resize-none bg-transparent text-center text-[17px] font-semibold leading-snug text-ink outline-none placeholder:text-pencil"
        />
      ) : (
        <p className="type-display mt-1 text-[17px] font-semibold leading-snug">
          {title || "What are you deciding?"}
        </p>
      )}
      {confidence !== null ? (
        <p className="type-figure mt-2 text-[12px] text-oxblood">{confidence}%</p>
      ) : null}
    </div>
  );
}

function NodeCard({
  node,
  zoom,
  tool,
  selected,
  connecting,
  editing,
  lit,
  onActivate,
  onEdit,
  onChange,
  onMove,
}: {
  node: CanvasNode;
  zoom: number;
  tool: Tool;
  selected: boolean;
  connecting: boolean;
  editing: boolean;
  lit: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onChange: (text: string) => void;
  onMove: (x: number, y: number) => void;
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

  const tone = kindTone(node.kind);

  return (
    <div
      data-node={node.id}
      className={cn(
        "absolute z-20 w-[min(17.5%,188px)] min-w-[148px] border bg-paper px-2.5 py-2",
        selected || connecting ? "border-ink" : "border-rule",
        lit && "stamp-in",
      )}
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (tool === "scratch" || tool === "connect") {
          onActivate();
          return;
        }
        if ((event.target as HTMLElement).tagName === "TEXTAREA") return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          startX: event.clientX,
          startY: event.clientY,
          originX: node.x,
          originY: node.y,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const board = event.currentTarget.parentElement;
        if (!board) return;
        const dx = event.clientX - drag.current.startX;
        const dy = event.clientY - drag.current.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
        onMove(
          clampPct(
            drag.current.originX + (dx / zoom / board.offsetWidth) * 100,
          ),
          clampPct(
            drag.current.originY + (dy / zoom / board.offsetHeight) * 100,
          ),
        );
      }}
      onPointerUp={(event) => {
        const wasDrag = drag.current?.moved;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (!wasDrag) onActivate();
      }}
    >
      <div className="flex items-start gap-1.5">
        {nodePerspective(node) ? (
          <PerspectiveEmblem
            perspective={nodePerspective(node)!}
            className="size-9 shrink-0"
          />
        ) : null}
        <p className={cn("type-eyebrow pt-0.5", tone.label)}>
          {node.seat ?? node.kind}
          {node.stance ? ` ${node.stance}` : ""}
          {node.author === "founder" ? (
            <span className="text-indigo"> · you</span>
          ) : null}
        </p>
      </div>
      <textarea
        ref={areaRef}
        value={node.text}
        rows={3}
        placeholder="One sentence."
        onFocus={onEdit}
        onChange={(event) => onChange(event.target.value)}
        className="type-display mt-1 w-full resize-none bg-transparent text-[13px] leading-snug text-ink outline-none placeholder:text-pencil"
      />
    </div>
  );
}

function LinkPath({
  link,
  nodes,
  size,
  lit,
}: {
  link: { id: string; fromId: string; toId: string; kind: string };
  nodes: CanvasNode[];
  size: { w: number; h: number };
  lit: boolean;
}) {
  const from = pointFor(link.fromId, nodes, size, "out");
  const to = pointFor(link.toId, nodes, size, "in");
  if (!from || !to) return null;
  const midY = (from.y + to.y) / 2;
  const color =
    link.kind === "counters"
      ? "var(--oxblood)"
      : link.kind === "handoff"
        ? "var(--indigo)"
        : "var(--rule-strong)";

  return (
    <path
      d={`M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`}
      fill="none"
      stroke={color}
      strokeWidth={lit ? 2 : 1.2}
      markerEnd="url(#canvas-arrow)"
    />
  );
}

function pointFor(
  nodeId: string,
  nodes: CanvasNode[],
  size: { w: number; h: number },
  end: "in" | "out",
) {
  const cardW = Math.min(size.w * 0.175, 188);
  const cardH = 92;
  if (nodeId === CANVAS_ROOT) {
    return {
      x: size.w / 2,
      y: end === "out" ? size.h * 0.05 + 92 : size.h * 0.05,
    };
  }
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return null;
  const x = (node.x / 100) * size.w + cardW / 2;
  const y = (node.y / 100) * size.h;
  return {
    x,
    y: end === "out" ? y + cardH : y,
  };
}

function MarkObject({
  mark,
  zoom,
  tool,
  selected,
  onSelect,
  onMove,
  onChange,
}: {
  mark: BoardMark;
  zoom: number;
  tool: Tool;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number, points?: BoardPoint[]) => void;
  onChange: (text: string) => void;
}) {
  const drag = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    points?: BoardPoint[];
    moved: boolean;
  } | null>(null);
  const box = markBox(mark);
  const drawing = tool === "pen" || tool === "circle" || tool === "box";
  const tone = inkColor(mark.author);

  return (
    <div
      data-mark={mark.id}
      className={cn(
        "absolute z-10",
        drawing && "pointer-events-none",
        mark.kind === "note"
          ? "border bg-paper px-2 py-1.5"
          : "border-2 bg-transparent",
        mark.shape === "circle" && "rounded-full",
        mark.kind === "stroke" && !selected && "border-transparent",
        selected ? "border-ink" : mark.kind === "note" ? "border-rule" : null,
      )}
      style={{
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: mark.kind === "note" ? "min(16%,168px)" : `${Math.max(box.w, 3)}%`,
        height: mark.kind === "note" ? "auto" : `${Math.max(box.h, 3)}%`,
        borderColor:
          mark.kind === "drawing" && !selected ? tone : undefined,
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (tool === "scratch") {
          onSelect();
          return;
        }
        if ((event.target as HTMLElement).tagName === "TEXTAREA") return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          startX: event.clientX,
          startY: event.clientY,
          originX: mark.x,
          originY: mark.y,
          points: mark.points,
          moved: false,
        };
        onSelect();
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const board = event.currentTarget.parentElement;
        if (!board) return;
        const dx =
          ((event.clientX - drag.current.startX) / zoom / board.offsetWidth) *
          100;
        const dy =
          ((event.clientY - drag.current.startY) / zoom / board.offsetHeight) *
          100;
        if (Math.abs(dx) + Math.abs(dy) > 0.4) drag.current.moved = true;
        const x = clampPct(drag.current.originX + dx);
        const y = clampPct(drag.current.originY + dy);
        if (drag.current.points) {
          onMove(
            x,
            y,
            drag.current.points.map((point) => ({
              x: clampPct(point.x + dx),
              y: clampPct(point.y + dy),
            })),
          );
        } else {
          onMove(x, y);
        }
      }}
      onPointerUp={(event) => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
    >
      {mark.kind === "note" ? (
        <textarea
          value={mark.text ?? ""}
          rows={2}
          placeholder="Text."
          onChange={(event) => onChange(event.target.value)}
          className="type-display w-full resize-none bg-transparent text-[13px] leading-snug text-ink outline-none placeholder:text-pencil"
        />
      ) : null}
    </div>
  );
}

function markBox(mark: BoardMark) {
  if (mark.kind === "stroke" && mark.points?.length) {
    const xs = mark.points.map((point) => point.x);
    const ys = mark.points.map((point) => point.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return {
      x,
      y,
      w: Math.max(3, Math.max(...xs) - x),
      h: Math.max(3, Math.max(...ys) - y),
    };
  }
  return { x: mark.x, y: mark.y, w: mark.w ?? 16, h: mark.h ?? 10 };
}

function SeatRail({ nodes }: { nodes: CanvasNode[] }) {
  const written = new Set(
    nodes
      .map((node) => node.perspective ?? seatToPerspective(node.seat))
      .filter((id): id is PerspectiveId => Boolean(id)),
  );

  return (
    <div className="flex items-end gap-4 border-b border-rule bg-paper px-3 py-2.5">
      <p className="type-eyebrow shrink-0 pb-1">Key</p>
      <ul className="flex min-w-0 flex-1 items-end justify-between gap-2">
      {PERSPECTIVES.map((perspective) => {
        const here = written.has(perspective.id);
        return (
          <li
            key={perspective.id}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5",
              here ? "text-ink" : "text-pencil",
            )}
          >
            <PerspectiveEmblem
              perspective={perspective.id}
              className="size-9"
            />
            <p className="type-eyebrow truncate">
              {perspectiveSeat(perspective.id)}
            </p>
          </li>
        );
      })}
      </ul>
    </div>
  );
}

function nodePerspective(node: CanvasNode): PerspectiveId | null {
  return node.perspective ?? seatToPerspective(node.seat);
}

function CameraWell({
  zoom,
  sheet,
  onZoomOut,
  onZoomIn,
  onReset,
  onFit,
  onSheet,
}: {
  zoom: number;
  sheet: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  onFit: () => void;
  onSheet: (index: number) => void;
}) {
  return (
    <div
      className="absolute bottom-3 right-3 z-40 border border-rule bg-paper px-1.5 py-1.5 shadow-[0_1px_0_var(--rule)]"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Zoom out"
          className="type-eyebrow px-2 py-1 text-graphite hover:text-ink"
          onClick={onZoomOut}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          className="type-eyebrow min-w-[3.4rem] px-1 py-1 text-ink"
          onClick={onReset}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          className="type-eyebrow px-2 py-1 text-graphite hover:text-ink"
          onClick={onZoomIn}
        >
          +
        </button>
        <button
          type="button"
          className="type-eyebrow px-2 py-1 text-graphite hover:text-ink"
          onClick={onFit}
        >
          Fit
        </button>
      </div>
      <div className="mt-1 flex items-center gap-0.5 border-t border-rule pt-1">
        <span className="type-eyebrow px-2 text-pencil">Sheet</span>
        {SHEETS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Board size ${item.label}`}
            aria-pressed={sheet === index}
            className={cn(
              "type-eyebrow px-2 py-1",
              sheet === index ? "bg-ink text-paper" : "text-graphite hover:text-ink",
            )}
            onClick={() => onSheet(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
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
    <span className="type-eyebrow hidden items-center gap-1.5 sm:inline-flex">
      <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
        <path
          d="M3 12 Q 6 4, 13 7"
          fill="none"
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
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

function kindTone(kind: CanvasKind) {
  if (kind === "claim") return { label: "text-indigo" };
  if (kind === "evidence") return { label: "text-moss" };
  if (kind === "risk") return { label: "text-oxblood" };
  if (kind === "assumption") return { label: "text-ochre" };
  return { label: "text-ink" };
}

function paintMark(
  ctx: CanvasRenderingContext2D,
  mark: BoardMark,
  size: { w: number; h: number },
) {
  ctx.strokeStyle = inkColor(mark.author);
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (mark.kind === "stroke" && mark.points?.length) {
    paintStroke(ctx, mark.points, size, inkColor(mark.author));
    return;
  }
  const x = (mark.x / 100) * size.w;
  const y = (mark.y / 100) * size.h;
  const w = ((mark.w ?? 16) / 100) * size.w;
  const h = ((mark.h ?? 12) / 100) * size.h;
  ctx.beginPath();
  if (mark.shape === "circle") {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (mark.shape === "box") {
    ctx.strokeRect(x, y, w, h);
  } else if (mark.shape === "arrow") {
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.moveTo(x + w * 0.7, y + h * 0.2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w * 0.7, y + h * 0.8);
  } else if (mark.shape === "cross") {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
  } else if (mark.shape === "check") {
    ctx.moveTo(x + w * 0.1, y + h * 0.55);
    ctx.lineTo(x + w * 0.38, y + h * 0.82);
    ctx.lineTo(x + w * 0.9, y + h * 0.18);
  } else {
    ctx.moveTo(x, y + h * 0.7);
    ctx.quadraticCurveTo(x + w * 0.4, y + h, x + w, y + h * 0.6);
  }
  ctx.stroke();
}

function paintShape(
  ctx: CanvasRenderingContext2D,
  shape: "circle" | "box",
  draft: { x: number; y: number; w: number; h: number },
  size: { w: number; h: number },
  color: string,
) {
  const x = (draft.x / 100) * size.w;
  const y = (draft.y / 100) * size.h;
  const w = (draft.w / 100) * size.w;
  const h = (draft.h / 100) * size.h;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(2, w / 2), Math.max(2, h / 2), 0, 0, Math.PI * 2);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.stroke();
}

function paintStroke(
  ctx: CanvasRenderingContext2D,
  points: BoardPoint[],
  size: { w: number; h: number },
  color: string,
) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo((points[0].x / 100) * size.w, (points[0].y / 100) * size.h);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo((points[i].x / 100) * size.w, (points[i].y / 100) * size.h);
  }
  ctx.stroke();
}

function hitMark(marks: BoardMark[], point: BoardPoint) {
  return [...marks].reverse().find((mark) => {
    const w = mark.w ?? 8;
    const h = mark.h ?? 8;
    return (
      point.x >= mark.x - 2 &&
      point.x <= mark.x + w + 2 &&
      point.y >= mark.y - 2 &&
      point.y <= mark.y + h + 2
    );
  });
}

function inkColor(author: Actor) {
  if (author === "founder") return "var(--indigo)";
  if (author === "agent") return "var(--oxblood)";
  return "var(--ink)";
}

function clampPct(value: number) {
  return Math.max(1, Math.min(96, value));
}

function clampZoom(value: number) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(value * 100) / 100));
}

function strokeLength(points: BoardPoint[]) {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return length;
}

export function seedFounderClaim(writeId: string, text: string, nodes: CanvasNode[]) {
  const seat = nextClaimSeat(nodes);
  return makeCanvasNode({
    decisionId: writeId,
    kind: "claim",
    text,
    x: seat.x,
    y: seat.y,
    author: "founder",
  });
}
