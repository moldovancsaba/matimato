import { describe, expect, it } from 'vitest';
import { createTutorialState, getSuggestedTutorialCell, resolveTutorialAi, selectTutorialCell } from '@/lib/game/tutorial';

describe('guided tutorial reducer', () => {
  it('teaches any tile, column, row, negative risk, and AI handoff in order', () => {
    let state = createTutorialState();
    expect(state.step).toBe('first-pick');

    let result = selectTutorialCell(state, getSuggestedTutorialCell(state));
    expect(result.accepted).toBe(true);
    expect(result.completedStep).toBe('first-pick');
    expect(result.state.step).toBe('column-target');

    state = result.state;
    result = selectTutorialCell(state, getSuggestedTutorialCell(state));
    expect(result.accepted).toBe(true);
    expect(result.completedStep).toBe('column-target');
    expect(result.state.step).toBe('row-target');

    state = result.state;
    result = selectTutorialCell(state, getSuggestedTutorialCell(state));
    expect(result.accepted).toBe(true);
    expect(result.completedStep).toBe('row-target');
    expect(result.state.step).toBe('negative-risk');

    state = result.state;
    const risk = getSuggestedTutorialCell(state);
    expect(risk.value).toBeLessThan(0);
    result = selectTutorialCell(state, risk);
    expect(result.accepted).toBe(true);
    expect(result.completedStep).toBe('negative-risk');
    expect(result.state.step).toBe('ai-turn');

    const ai = resolveTutorialAi(result.state);
    expect(ai.accepted).toBe(true);
    expect(ai.completedStep).toBe('ai-turn');
    expect(ai.state.step).toBe('finish');
  });

  it('rejects positive picks during the negative-risk lesson', () => {
    let state = createTutorialState();
    state = selectTutorialCell(state, getSuggestedTutorialCell(state)).state;
    state = selectTutorialCell(state, getSuggestedTutorialCell(state)).state;
    state = selectTutorialCell(state, getSuggestedTutorialCell(state)).state;

    const positive = state.board.find((cell) => !cell.removed && cell.value > 0)!;
    const result = selectTutorialCell(state, positive);
    expect(result.accepted).toBe(false);
    expect(result.state.step).toBe('negative-risk');
  });
});
