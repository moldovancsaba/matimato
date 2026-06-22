import { describe, expect, it } from 'vitest';
import { applyMove, newGame } from '@/lib/game/rules';

describe('matimato rules', () => {
  it('creates only 9x9 boards', () => {
    const game = newGame('test-game', 'solo', 'p1', 'Player');
    expect(game.board).toHaveLength(81);
    expect(new Set(game.board.map((cell) => cell.row))).toEqual(new Set([0,1,2,3,4,5,6,7,8]));
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
});
