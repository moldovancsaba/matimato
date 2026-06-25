import { describe, expect, it } from 'vitest';
import { applyMove, applyTimeout, createBoard, newGame } from '@/lib/game/rules';
import type { BoardSize } from '@/lib/shared/types';

describe('matimato rules', () => {
  it('creates default 9x9 boards and explicit 5x5 through 9x9 boards', () => {
    const game = newGame('test-game', 'solo', 'p1', 'Player');
    expect(game.board).toHaveLength(81);
    expect(new Set(game.board.map((cell) => cell.row))).toEqual(new Set([0,1,2,3,4,5,6,7,8]));
    const small = newGame('test-game-small', 'solo', 'p1', 'Player', { boardSize: 5 });
    expect(small.boardSize).toBe(5);
    expect(small.board).toHaveLength(25);
    expect(new Set(small.board.map((cell) => cell.row))).toEqual(new Set([0,1,2,3,4]));
  });

  it('generates Latin-square magnitudes for every progression board size', () => {
    for (const size of [5, 6, 7, 8, 9] as BoardSize[]) {
      const board = createBoard(`latin:${size}`, size);
      const expected = new Set([...Array(size).keys()].map((value) => value + 1));
      for (let index = 0; index < size; index += 1) {
        const row = board.filter((cell) => cell.row === index).map((cell) => cell.magnitude);
        const col = board.filter((cell) => cell.col === index).map((cell) => cell.magnitude);
        expect(new Set(row), `${size}x${size} row ${index + 1}`).toEqual(expected);
        expect(new Set(col), `${size}x${size} column ${index + 1}`).toEqual(expected);
      }
    }
  });

  it('starts with any tile and then restricts to the selected column', () => {
    const game = newGame('test-game-2', 'solo', 'p1', 'Player');
    const first = applyMove(game, 'north', 2, 4, 'a1');
    expect(first.frame.fromTarget.axis).toBe('any');
    expect(first.snapshot.legalTarget).toEqual({ axis: 'column', index: 4 });
  });

  it('switches from column to selected row', () => {
    const game = newGame('test-game-3', 'battle', 'p1', 'Player');
    const first = applyMove({ ...game, status: 'active', players: { ...game.players, south: { id: 'p2', tag: 'Rival', side: 'south', score: 0 } } }, 'north', 1, 3, 'a1');
    const second = applyMove(first.snapshot, 'south', 6, 3, 'a2');
    expect(second.snapshot.legalTarget).toEqual({ axis: 'row', index: 6 });
  });

  it('records move logs for recap replay', () => {
    const game = newGame('recap-game', 'solo', 'p1', 'Player');
    const first = applyMove(game, 'north', 2, 4, 'a1');
    expect(first.snapshot.moveLog).toHaveLength(1);
    expect(first.snapshot.moveLog?.[0]).toMatchObject({ actionId: 'a1', selected: { row: 2, col: 4 } });
  });

  it('creates server-authoritative blitz clocks and resolves duplicate timeouts idempotently', () => {
    const createdAt = new Date('2026-06-25T10:00:00.000Z');
    const game = newGame('blitz-game', 'blitz', 'p1', 'Player', { now: createdAt, clock: { turnLimitMs: 5000 } });
    expect(game.clock?.deadlineVersion).toBe(0);
    expect(game.clock?.deadlineAt).toBe('2026-06-25T10:00:05.000Z');

    const expiredAt = new Date('2026-06-25T10:00:07.000Z');
    const firstTimeout = applyTimeout(game, 'north', 0, expiredAt);
    expect(firstTimeout.resolved).toBe(true);
    expect(firstTimeout.snapshot.currentTurn).toBe('south');
    expect(firstTimeout.snapshot.clock?.deadlineVersion).toBe(1);
    expect(firstTimeout.frames[0].timeout).toMatchObject({ side: 'north', deadlineVersion: 0, count: 1 });

    const duplicate = applyTimeout(firstTimeout.snapshot, 'north', 0, new Date('2026-06-25T10:00:08.000Z'));
    expect(duplicate.resolved).toBe(false);
    expect(duplicate.frames).toHaveLength(0);
  });

  it('forfeits blitz after repeated timeouts', () => {
    const game = newGame('blitz-forfeit', 'blitz', 'p1', 'Player', { now: new Date('2026-06-25T10:00:00.000Z'), clock: { turnLimitMs: 5000 } });
    const northFirst = applyTimeout(game, 'north', 0, new Date('2026-06-25T10:00:07.000Z')).snapshot;
    const southFirst = applyTimeout(northFirst, 'south', 1, new Date('2026-06-25T10:00:14.000Z')).snapshot;
    const northSecond = applyTimeout(southFirst, 'north', 2, new Date('2026-06-25T10:00:21.000Z'));
    expect(northSecond.snapshot.status).toBe('complete');
    expect(northSecond.snapshot.outcome).toEqual({ winner: 'south', reason: 'timeout-forfeit' });
    expect(northSecond.snapshot.clock?.enabled).toBe(false);
  });
});
