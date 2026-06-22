"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { VisuallyHidden } from "@doneisbetter/gds/client";
import type { PublicGameDto } from "@/lib/game/types";

type BoardRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BlobState = {
  rect: BoardRect;
  phase: "idle" | "collapse" | "grow";
  axis: "row" | "column" | "cell";
};

export type MatimatoBoardHandle = {
  playMoveTransition: (previousGame: PublicGameDto, nextGame: PublicGameDto, commitNextGame: () => void) => Promise<void>;
  resetBoardAnimation: () => void;
};

type MatimatoBoardProps = {
  game: PublicGameDto;
  disabled: boolean;
  onSelect: (viewRow: number, viewCol: number) => void;
  turnAnnouncement: string;
};

const BOARD_SIZE = 9;
const WORLD_SIZE = 900;
const BOARD_PAD = 26;
const TILE_GAP = 10;
const TILE_SIZE = (WORLD_SIZE - BOARD_PAD * 2 - TILE_GAP * (BOARD_SIZE - 1)) / BOARD_SIZE;
const ROW_TRAVEL_MS = 760;
const COLUMN_TRAVEL_MS = 1120;

export const MatimatoBoard = forwardRef<MatimatoBoardHandle, MatimatoBoardProps>(function MatimatoBoard(
  { game, disabled, onSelect, turnAnnouncement },
  ref
) {
  const blobRef = useRef<SVGRectElement | null>(null);
  const animationRun = useRef(0);
  const animating = useRef(false);
  const [blob, setBlob] = useState<BlobState | null>(null);
  const legalKey = useMemo(() => new Set(game.legalCellsView.map((cell) => `${cell.viewRow}:${cell.viewCol}`)), [game.legalCellsView]);
  const constraintAxis = game.constraintView?.axis;
  const constraintIndex = game.constraintView?.index;

  useImperativeHandle(ref, () => ({
    async playMoveTransition(previousGame, nextGame, commitNextGame) {
      const run = animationRun.current + 1;
      animationRun.current = run;

      const previousConstraint = previousGame.constraintView;
      const nextConstraint = nextGame.constraintView;
      const selectedCell = nextGame.lastMoveView;

      if (previousGame.id !== nextGame.id || nextGame.status !== "active" || !nextConstraint || !selectedCell) {
        commitNextGame();
        resetAnimation();
        return;
      }

      const selectedRect = cellRect(selectedCell.viewRow, selectedCell.viewCol);
      const fromRect = previousConstraint ? trackRect(previousConstraint.axis, previousConstraint.index) : selectedRect;
      const targetRect = trackRect(nextConstraint.axis, nextConstraint.index);
      const collapseMs = previousConstraint ? durationForAxis(previousConstraint.axis) : 0;
      const growMs = durationForAxis(nextConstraint.axis);

      animating.current = true;
      setBlob({ rect: fromRect, phase: "collapse", axis: previousConstraint?.axis ?? "cell" });
      await nextFrame();
      if (animationRun.current !== run) return;

      if (collapseMs > 0) {
        await animateBlob(blobRef.current, fromRect, selectedRect, collapseMs, () => animationRun.current === run);
      }
      if (animationRun.current !== run) return;

      setBlob({ rect: selectedRect, phase: "collapse", axis: "cell" });
      commitNextGame();
      await nextFrame();
      if (animationRun.current !== run) return;

      setBlob({ rect: selectedRect, phase: "grow", axis: "cell" });
      await nextFrame();
      if (animationRun.current !== run) return;

      await animateBlob(blobRef.current, selectedRect, targetRect, growMs, () => animationRun.current === run);
      if (animationRun.current !== run) return;

      setBlob({ rect: targetRect, phase: "idle", axis: nextConstraint.axis });
      animating.current = false;
    },
    resetBoardAnimation() {
      resetAnimation();
    }
  }));

  useLayoutEffect(() => {
    if (animating.current) return;
    if (game.status !== "active" || !constraintAxis || constraintIndex === undefined) {
      setBlob(null);
      return;
    }

    setBlob({ rect: trackRect(constraintAxis, constraintIndex), phase: "idle", axis: constraintAxis });
  }, [game.id, game.status, game.version, constraintAxis, constraintIndex]);

  function resetAnimation() {
    animationRun.current += 1;
    animating.current = false;
    setBlob(null);
  }

  return (
    <>
      <VisuallyHidden aria-live="polite">{turnAnnouncement}</VisuallyHidden>
      <svg
        className="matimato-board"
        data-constraint-axis={game.constraintView?.axis ?? "free"}
        data-blob-phase={blob?.phase ?? "none"}
        viewBox={`0 0 ${WORLD_SIZE} ${WORLD_SIZE}`}
        role="grid"
        aria-label={`Matimato ${game.boardSize} by ${game.boardSize} board`}
      >
        <rect className="matimato-board-surface" x="0" y="0" width={WORLD_SIZE} height={WORLD_SIZE} rx="38" />
        {blob ? (
          <rect
            aria-hidden="true"
            className="matimato-blob"
            ref={blobRef}
            data-phase={blob.phase}
            data-axis={blob.axis}
            x={blob.rect.x}
            y={blob.rect.y}
            width={blob.rect.width}
            height={blob.rect.height}
            rx={blobRadius(blob.axis)}
          />
        ) : null}
        {game.boardView.map((row, rowIndex) =>
          row.map((value, colIndex) => {
            const key = `${rowIndex}:${colIndex}`;
            const legal = legalKey.has(key);
            const claimed = value === null;
            const rect = cellRect(rowIndex, colIndex);
            const canSelect = Boolean(game.viewer?.canMove && legal && !claimed && !disabled);
            return (
              <g
                key={key}
                className="matimato-tile"
                role="gridcell"
                tabIndex={canSelect ? 0 : -1}
                data-legal={Boolean(game.constraintView) && legal}
                data-claimed={claimed}
                data-sign={value === null ? "claimed" : value > 0 ? "positive" : "negative"}
                aria-label={cellLabel(value, rowIndex, colIndex, legal)}
                aria-disabled={!canSelect}
                onClick={() => {
                  if (canSelect) onSelect(rowIndex, colIndex);
                }}
                onKeyDown={(event) => {
                  if (!canSelect || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  onSelect(rowIndex, colIndex);
                }}
              >
                <rect className="matimato-tile-face" x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx="18" />
                {value === null ? null : (
                  <text
                    className="matimato-tile-number"
                    x={rect.x + rect.width / 2}
                    y={rect.y + rect.height / 2}
                    dominantBaseline="central"
                    textAnchor="middle"
                  >
                    {Math.abs(value)}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>
    </>
  );
});

function cellRect(row: number, col: number): BoardRect {
  return {
    x: BOARD_PAD + col * (TILE_SIZE + TILE_GAP),
    y: BOARD_PAD + row * (TILE_SIZE + TILE_GAP),
    width: TILE_SIZE,
    height: TILE_SIZE
  };
}

function trackRect(axis: "row" | "column", index: number): BoardRect {
  const first = axis === "row" ? cellRect(index, 0) : cellRect(0, index);
  const last = axis === "row" ? cellRect(index, BOARD_SIZE - 1) : cellRect(BOARD_SIZE - 1, index);
  if (axis === "row") {
    return {
      x: first.x,
      y: first.y,
      width: last.x + last.width - first.x,
      height: first.height
    };
  }
  return {
    x: first.x,
    y: first.y,
    width: first.width,
    height: last.y + last.height - first.y
  };
}

async function animateBlob(
  element: SVGRectElement | null,
  from: BoardRect,
  to: BoardRect,
  durationMs: number,
  shouldContinue: () => boolean
) {
  if (!element || durationMs <= 0) return;
  const target = element;
  await new Promise<void>((resolve) => {
    const startedAt = performance.now();

    function tick(now: number) {
      if (!shouldContinue()) {
        resolve();
        return;
      }

      const progress = Math.min(1, (now - startedAt) / durationMs);
      writeBlobRect(target, {
        x: lerp(from.x, to.x, progress),
        y: lerp(from.y, to.y, progress),
        width: lerp(from.width, to.width, progress),
        height: lerp(from.height, to.height, progress)
      });

      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }

      writeBlobRect(target, to);
      resolve();
    }

    requestAnimationFrame(tick);
  });
}

function writeBlobRect(element: SVGRectElement, rect: BoardRect) {
  element.setAttribute("x", rect.x.toFixed(3));
  element.setAttribute("y", rect.y.toFixed(3));
  element.setAttribute("width", rect.width.toFixed(3));
  element.setAttribute("height", rect.height.toFixed(3));
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function durationForAxis(axis: "row" | "column") {
  return axis === "column" ? COLUMN_TRAVEL_MS : ROW_TRAVEL_MS;
}

function blobRadius(axis: "row" | "column" | "cell") {
  return axis === "cell" ? 18 : 999;
}

function cellLabel(value: number | null, row: number, col: number, legal: boolean) {
  const state = value === null ? "claimed" : `${value > 0 ? "positive" : "negative"} ${Math.abs(value)}`;
  return `Row ${row + 1}, column ${col + 1}, ${state}${legal ? ", legal move" : ""}`;
}
