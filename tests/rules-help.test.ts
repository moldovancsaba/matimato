import { describe, expect, it } from 'vitest';
import { RULES_HELP_TOPICS, deriveContextualHint, topicForScreen } from '@/lib/game/rules-help';
import type { BoardCell } from '@/lib/shared/types';

describe('rules help', () => {
  it('keeps required help topics available', () => {
    expect(RULES_HELP_TOPICS.map((topic) => topic.topicId)).toEqual(['objective', 'turns', 'legal-moves', 'scoring', 'traps', 'xp', 'boards', 'recap', 'ranks']);
    expect(topicForScreen('journey')).toBe('boards');
    expect(topicForScreen('ranks')).toBe('ranks');
  });

  it('derives blocked and warning contextual hints from public board state', () => {
    const board: BoardCell[] = [
      { row: 0, col: 0, magnitude: 1, sign: 1, value: 1, removed: true },
      { row: 0, col: 1, magnitude: 2, sign: -1, value: -2, removed: false }
    ];
    expect(deriveContextualHint({ board, legalTarget: { axis: 'column', index: 0 }, currentTurn: 'north', boardSize: 5 }).severity).toBe('blocked');
    expect(deriveContextualHint({ board, legalTarget: { axis: 'column', index: 1 }, currentTurn: 'north', boardSize: 5 }).severity).toBe('warning');
  });
});
