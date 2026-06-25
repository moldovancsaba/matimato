import { describe, expect, it } from 'vitest';
import { applyBoardPurchase, canPurchaseBoard, createProgression, selectActiveBoard, shouldShowTrainingChoice } from '@/lib/game/progression';

describe('board progression contracts', () => {
  it('initializes legacy profiles with 5x5 unlocked and spendable XP copied from lifetime XP', () => {
    const progression = createProgression({ xp: 200 });
    expect(progression.wallet).toEqual({ lifetimeXp: 200, spendableXp: 200 });
    expect(progression.boardUnlocks.unlockedBoardSizes).toEqual([5]);
    expect(progression.boardUnlocks.activeBoardSize).toBe(5);
    expect(progression.boardUnlocks.nextUnlock).toEqual({ boardSize: 6, costXp: 120 });
  });

  it('buys boards sequentially and reduces spendable XP only', () => {
    const base = createProgression({ xp: 500, spendableXp: 500 });
    const after6 = applyBoardPurchase(base, 6, 'purchase-6', '2026-06-25T10:00:00.000Z');
    expect(after6.wallet).toEqual({ lifetimeXp: 500, spendableXp: 380 });
    expect(after6.boardUnlocks.activeBoardSize).toBe(6);
    expect(after6.boardUnlocks.unlockedBoardSizes).toEqual([5, 6]);
    expect(after6.boardUnlocks.nextUnlock).toEqual({ boardSize: 7, costXp: 260 });
  });

  it('rejects skipped boards and insufficient XP', () => {
    const base = createProgression({ xp: 200, spendableXp: 200 });
    expect(canPurchaseBoard(base, 8)).toMatchObject({ ok: false, code: 'BOARD_SEQUENCE_LOCKED' });
    expect(canPurchaseBoard(createProgression({ xp: 50, spendableXp: 50 }), 6)).toMatchObject({ ok: false, code: 'INSUFFICIENT_XP' });
  });

  it('keeps duplicate purchases idempotent', () => {
    const after6 = applyBoardPurchase(createProgression({ xp: 500, spendableXp: 500 }), 6, 'same-action');
    expect(applyBoardPurchase(after6, 6, 'same-action')).toEqual(after6);
  });

  it('selects only unlocked boards', () => {
    const after6 = applyBoardPurchase(createProgression({ xp: 500, spendableXp: 500 }), 6, 'purchase-6');
    expect(selectActiveBoard(after6, 5).boardUnlocks.activeBoardSize).toBe(5);
    expect(() => selectActiveBoard(after6, 7)).toThrow('BOARD_LOCKED');
  });

  it('shows training choice only for untouched first-run onboarding', () => {
    expect(shouldShowTrainingChoice(null)).toBe(true);
    expect(shouldShowTrainingChoice(null, 'match-1')).toBe(false);
    expect(shouldShowTrainingChoice({ playerId: 'p1', trainingChoice: 'play-now', updatedAt: '2026-06-25T00:00:00.000Z' })).toBe(false);
    expect(shouldShowTrainingChoice({ playerId: 'p1', completedAt: '2026-06-25T00:00:00.000Z', updatedAt: '2026-06-25T00:00:00.000Z' })).toBe(false);
  });
});
