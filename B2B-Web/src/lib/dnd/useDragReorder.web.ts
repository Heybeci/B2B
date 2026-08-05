import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { View } from "react-native";

// Manual pointer-based drag-to-reorder — the same raw-DOM-event technique as
// the folder-tree/file-grid resize splitter in FolderBrowser.tsx (ref to a
// View, cast the current node to HTMLElement, raw
// addEventListener("mousedown"/"mousemove"/"mouseup")), because
// react-native-web's View/Pressable expose no mouse-event props of their own.
// See FolderBrowser.tsx's resize `useEffect` for the reference pattern this
// mirrors.
//
// Two geometry modes, since this hook drives both a vertical list (the
// folder tree) and a wrapping grid (the file grid):
//  - "list": target position is decided purely by Y — walk sibling row
//    midpoints top to bottom and land before the first one the pointer is
//    still above.
//  - "grid": target position is decided by nearest-neighbor center distance
//    (both X and Y matter in a wrapping grid), then before/after that
//    neighbor by comparing X (reading order: left to right, wrapping to the
//    next row when past the last column).
//
// Two additive visual mechanisms make the drag actually read as motion
// (previously the only cue was the dragged tile dropping to 50% opacity in
// place, with every affected tile — dragged one included — teleporting
// instantly whenever the live order changed):
//
//  1. FLIP auto-animation. Every item (including the dimmed placeholder left
//     behind by the dragged tile) gets measured via getBoundingClientRect()
//     before and after each live-order change; the delta is applied as an
//     instant `transform: translate()` then animated back to identity over a
//     short CSS transition (classic First-Last-Invert-Play). This runs in a
//     `useLayoutEffect` keyed on the *live* order so it fires on every
//     mousemove-triggered reorder, giving a continuous "siblings slide out
//     of the way" feel. These transform/transition properties are set via
//     direct DOM mutation (`el.style.transform = ...`), never through a
//     React-controlled `style` prop — React's style diffing only touches
//     properties it previously set itself, so it never fights with or resets
//     these imperative values (the same reasoning already relied on for
//     `el.style.cursor` below).
//  2. A cloned "ghost" tile. On drag start the dragged DOM node is cloned
//     (`cloneNode(true)`, which carries over its Tailwind-generated classes
//     and any thumbnail <img> src unchanged) into a `position: fixed`
//     element appended to `document.body`, lifted with a stronger shadow +
//     slight scale, and moved 1:1 with the pointer on every mousemove. The
//     original tile stays in the live-ordered array (so the reorder/FLIP
//     logic above is unaffected) but renders as a dimmed placeholder via the
//     existing `dragging` flag. The ghost fades out on drop.

const FLIP_DURATION_MS = 220;
const GHOST_SHADOW = "0 20px 40px rgba(24,21,15,0.32), 0 2px 8px rgba(24,21,15,0.24)";

export interface DragReorderOptions<T> {
  items: T[];
  getId: (item: T) => number;
  onReorder: (orderedIds: number[]) => void;
  layout?: "list" | "grid";
  // Gate for admin-only reordering — when false, handle refs never attach a
  // "mousedown" listener, so dragging can never start (items/draggingId
  // still behave, they just never change).
  enabled?: boolean;
}

export interface DragReorderResult<T> {
  // Live-reordered items to render — identical to the input `items` when
  // nothing is being dragged, and reflects the in-progress drag position
  // while one is (so the grid/tree visibly reorders as the pointer moves).
  items: T[];
  draggingId: number | null;
  // Ref callback for the row/card container — attach to EVERY item (not just
  // the one being dragged), so its on-screen position can be measured
  // against the pointer while a sibling is being dragged, and so the FLIP
  // effect can measure/animate it.
  getItemRef: (id: number) => (node: View | null) => void;
  // Ref callback for the small drag-handle glyph inside each item. A raw
  // "mousedown" listener is attached directly to its DOM node on mount,
  // starting the drag for that item's id.
  getHandleRef: (id: number) => (node: View | null) => void;
}

export function useDragReorder<T>({
  items,
  getId,
  onReorder,
  layout = "list",
  enabled = true,
}: DragReorderOptions<T>): DragReorderResult<T> {
  const [liveItems, setLiveItems] = useState(items);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const liveItemsRef = useRef(items);
  const draggingIdRef = useRef<number | null>(null);
  const reorderedRef = useRef(false);
  const itemRefs = useRef(new Map<number, HTMLElement>());
  const handleCleanups = useRef(new Map<number, () => void>());
  // Last-measured rect per id, used by the FLIP effect below to compute the
  // delta between "before" and "after" whenever the live order changes.
  const rectsRef = useRef(new Map<number, DOMRect>());
  const ghostRef = useRef<HTMLElement | null>(null);
  const ghostCleanupRef = useRef<(() => void) | null>(null);

  // Resync from upstream data (refetch, another user's change, etc.) — but
  // never while a drag is in progress, which would yank the row out from
  // under the pointer mid-drag.
  //
  // Keyed on the full serialized content (a stable primitive), NOT on the
  // `items` array reference itself, and NOT on just the id list either — an
  // id-only key used to live here, but that made a rename invisible to this
  // effect (same ids, same order, only a name field changed), so `liveItems`
  // kept rendering the pre-rename object until a full page reload remounted
  // everything. Callers commonly derive `items` with a `data?.folders ?? []`
  // fallback (e.g. FolderTree.tsx's collapsed-node `children`, sourced from
  // a disabled `useBrowseHotel` query whose `data` stays `undefined`
  // forever) — every render then allocates a brand-new `[]`, which is
  // reference-unequal to the previous one even though the content never
  // changed. With `items` itself as the dependency, that fresh reference
  // re-fires this effect on every render; calling `setLiveItems` with yet
  // another new (but equally empty) array is enough to trigger another
  // render, which allocates another new `[]`, forever — a self-sustaining
  // infinite loop once anything (e.g. a sibling's `dragging` prop changing
  // during a drag elsewhere in the same list) forces one extra render of a
  // component sitting on this pattern. `JSON.stringify([])` is a stable
  // `"[]"` every render, so comparing by full content keeps that immunity
  // while also catching field-level changes like a rename.
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (draggingIdRef.current === null) {
      liveItemsRef.current = items;
      setLiveItems(items);
    }
    // itemsKey is the intentional dependency (content, not reference) — see
    // comment above. `items` itself must stay out of this array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  // FLIP: whenever the rendered order actually changes (drag-driven reorder
  // or an upstream resync), diff each item's new position against its last
  // measured one and animate the difference away. Runs in a layout effect so
  // the inverted transform is applied before the browser paints the new
  // (already-reflowed) layout — otherwise there'd be a one-frame flash at the
  // final position before the animation kicked in.
  const liveItemsKey = liveItems.map(getId).join(",");
  useLayoutEffect(() => {
    itemRefs.current.forEach((el, id) => {
      const prev = rectsRef.current.get(id);
      const next = el.getBoundingClientRect();
      if (prev) {
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (dx !== 0 || dy !== 0) {
          el.style.transition = "none";
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          // Force a reflow so the browser registers the "start" transform
          // above before we switch to the animated end state below —
          // otherwise the two style writes would coalesce into one and
          // nothing would visibly animate.
          void el.getBoundingClientRect();
          requestAnimationFrame(() => {
            el.style.transition = `transform ${FLIP_DURATION_MS}ms ease`;
            el.style.transform = "";
          });
        }
      }
      rectsRef.current.set(id, next);
    });
    // liveItemsKey (content, not reference) is the intentional dependency —
    // same reasoning as itemsKey above. No other reactive values are read
    // inside this effect (itemRefs/rectsRef are refs, FLIP_DURATION_MS is a
    // module constant), so nothing else belongs in this array.
  }, [liveItemsKey]);

  const computeTargetIndex = useCallback(
    (pointerX: number, pointerY: number, without: T[]): number => {
      const entries: { index: number; rect: DOMRect }[] = [];
      without.forEach((it, index) => {
        const el = itemRefs.current.get(getId(it));
        if (el) entries.push({ index, rect: el.getBoundingClientRect() });
      });
      if (entries.length === 0) return without.length;

      if (layout === "list") {
        for (const entry of entries) {
          const midY = entry.rect.top + entry.rect.height / 2;
          if (pointerY < midY) return entry.index;
        }
        return without.length;
      }

      // grid: nearest-neighbor by center distance, then before/after by X.
      let nearest = entries[0];
      let bestDist = Infinity;
      for (const entry of entries) {
        const cx = entry.rect.left + entry.rect.width / 2;
        const cy = entry.rect.top + entry.rect.height / 2;
        const dist = (pointerX - cx) ** 2 + (pointerY - cy) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          nearest = entry;
        }
      }
      const centerX = nearest.rect.left + nearest.rect.width / 2;
      return pointerX > centerX ? nearest.index + 1 : nearest.index;
    },
    [getId, layout],
  );

  // Remove the floating ghost, optionally with a quick fade instead of an
  // instant disappearance.
  const dismissGhost = useCallback((animate: boolean) => {
    if (ghostCleanupRef.current) {
      ghostCleanupRef.current();
      ghostCleanupRef.current = null;
    }
    const ghost = ghostRef.current;
    if (!ghost) return;
    ghostRef.current = null;
    if (!animate) {
      ghost.remove();
      return;
    }
    ghost.style.transition = "opacity 150ms ease, transform 150ms ease";
    ghost.style.opacity = "0";
    ghost.style.transform = `${ghost.dataset.baseTransform ?? ""} scale(0.96)`;
    window.setTimeout(() => ghost.remove(), 160);
  }, []);

  const startDrag = useCallback(
    (id: number, startEvent: MouseEvent) => {
      draggingIdRef.current = id;
      reorderedRef.current = false;
      setDraggingId(id);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      // Build the floating ghost from a frozen clone of the dragged node —
      // it carries over the node's Tailwind-generated classes (and, for a
      // file card, its thumbnail <img> src) unchanged, so it looks identical
      // to the real tile without any hand-written styling. It's appended
      // straight to <body>, entirely outside React's tree, so every mutation
      // below is a plain DOM write with nothing to conflict with.
      let offsetX = 0;
      let offsetY = 0;
      const sourceEl = itemRefs.current.get(id);
      if (sourceEl) {
        const rect = sourceEl.getBoundingClientRect();
        offsetX = startEvent.clientX - rect.left;
        offsetY = startEvent.clientY - rect.top;
        const ghost = sourceEl.cloneNode(true) as HTMLElement;
        const baseTransform = "scale(1.035) rotate(-0.6deg)";
        ghost.dataset.baseTransform = baseTransform;
        Object.assign(ghost.style, {
          position: "fixed",
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: "0",
          zIndex: "9999",
          pointerEvents: "none",
          boxShadow: GHOST_SHADOW,
          transform: baseTransform,
          transformOrigin: "center",
          transition: "box-shadow 120ms ease, transform 120ms ease",
          opacity: "0.98",
        } satisfies Partial<CSSStyleDeclaration>);
        document.body.appendChild(ghost);
        ghostRef.current = ghost;
      }

      const onMouseMove = (e: MouseEvent) => {
        const ghost = ghostRef.current;
        if (ghost) {
          ghost.style.left = `${e.clientX - offsetX}px`;
          ghost.style.top = `${e.clientY - offsetY}px`;
        }
        const order = liveItemsRef.current;
        const draggedItem = order.find((it) => getId(it) === id);
        if (!draggedItem) return;
        const without = order.filter((it) => getId(it) !== id);
        const targetIndex = computeTargetIndex(e.clientX, e.clientY, without);
        const next = [...without];
        next.splice(targetIndex, 0, draggedItem);
        const changed = next.some((it, i) => getId(it) !== getId(order[i]));
        if (changed) {
          reorderedRef.current = true;
          liveItemsRef.current = next;
          setLiveItems(next);
        }
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        draggingIdRef.current = null;
        setDraggingId(null);
        dismissGhost(true);
        if (reorderedRef.current) {
          onReorder(liveItemsRef.current.map((it) => getId(it)));
        }
      };

      ghostCleanupRef.current = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [computeTargetIndex, dismissGhost, getId, onReorder],
  );

  // If this instance unmounts mid-drag (e.g. the folder tree collapses the
  // dragged item's parent), don't leave an orphaned ghost/listeners behind.
  useEffect(() => () => dismissGhost(false), [dismissGhost]);

  const getItemRef = useCallback(
    (id: number) => (node: View | null) => {
      const el = node as unknown as HTMLElement | null;
      if (el) itemRefs.current.set(id, el);
      else {
        itemRefs.current.delete(id);
        rectsRef.current.delete(id);
      }
    },
    [],
  );

  const getHandleRef = useCallback(
    (id: number) => (node: View | null) => {
      // Ref callbacks re-fire on every render with a new node identity in
      // some RNW paths — always clear a previous listener for this id before
      // (maybe) attaching a new one, so unmount/remount never leaks one.
      const cleanup = handleCleanups.current.get(id);
      if (cleanup) {
        cleanup();
        handleCleanups.current.delete(id);
      }
      const el = node as unknown as HTMLElement | null;
      if (!el || !enabled) return;
      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        startDrag(id, e);
      };
      const onClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
      };
      el.style.cursor = "grab";
      el.addEventListener("mousedown", onMouseDown);
      el.addEventListener("click", onClick);
      handleCleanups.current.set(id, () => {
        el.removeEventListener("mousedown", onMouseDown);
        el.removeEventListener("click", onClick);
      });
    },
    [enabled, startDrag],
  );

  return { items: liveItems, draggingId, getItemRef, getHandleRef };
}
