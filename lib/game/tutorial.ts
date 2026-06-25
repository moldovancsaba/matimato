import type { BoardCell, LegalTarget, PlayerSide, TutorialStepId } from '@/lib/shared/types';
import { chooseAiMove, createBoard, isLegal } from './rules';

export type TutorialState = {
  board: BoardCell[];
  currentTurn: PlayerSide;
  legalTarget: LegalTarget;
  scores: Record<PlayerSide, number>;
  step: TutorialStepId;
  completedSteps: TutorialStepId[];
  message: string;
};

export type TutorialSelectResult = {
  state: TutorialState;
  accepted: boolean;
  completedStep?: TutorialStepId;
  announcement: string;
};

export const TUTORIAL_SEED = 'matimato-guided-first-match-v1';

export const TUTORIAL_STEPS: Array<{ id: TutorialStepId; title: string; body: string }> = [
  { id: 'first-pick', title: 'Pick any tile', body: 'Start anywhere. Positive tiles add to your score, while negative tiles teach risk.' },
  { id: 'column-target', title: 'Follow the column', body: 'Your first tile points the next move into that column.' },
  { id: 'row-target', title: 'Switch to a row', body: 'A move from a column sends the next player into that row.' },
  { id: 'negative-risk', title: 'Read the risk', body: 'Negative tiles are legal too. Choose one deliberately so the rule is clear.' },
  { id: 'ai-turn', title: 'Bot handoff', body: 'Matimato AI resolves its response from the same legal-target rule.' },
  { id: 'finish', title: 'Ready for a real match', body: 'You have used any, column, row, score, risk, and AI handoff rules.' }
];

export function createTutorialState(lastStep?: TutorialStepId): TutorialState {
  let state: TutorialState = {
    board: createBoard(TUTORIAL_SEED, 5),
    currentTurn: 'north',
    legalTarget: { axis: 'any' },
    scores: { north: 0, south: 0 },
    step: 'first-pick',
    completedSteps: [],
    message: 'Choose any open tile to start the chase.'
  };
  for (const step of TUTORIAL_STEPS) {
    if (!lastStep || state.completedSteps.includes(lastStep)) break;
    if (step.id === 'ai-turn') state = resolveTutorialAi(state).state;
    else if (step.id !== 'finish') state = selectTutorialCell(state, getSuggestedTutorialCell(state)).state;
  }
  return state;
}

export function selectTutorialCell(state: TutorialState, cell: BoardCell): TutorialSelectResult {
  if (state.currentTurn !== 'north') {
    return { state, accepted: false, announcement: 'Wait for Matimato AI to finish its response.' };
  }
  if (!isLegal(state.legalTarget, cell.row, cell.col, state.board) || cell.removed) {
    return { state, accepted: false, announcement: 'That tile is outside the current legal target.' };
  }
  if (state.step === 'negative-risk' && cell.value >= 0) {
    return { state, accepted: false, announcement: 'Choose a negative tile for this lesson so risk is explicit.' };
  }
  const next = applyTutorialClaim(state, 'north', cell);
  const completedStep = state.step;
  const advanced = advanceAfterPlayerMove(next, completedStep);
  return {
    state: advanced,
    accepted: true,
    completedStep,
    announcement: `You claimed ${formatSignedValue(cell.value)}. ${advanced.message}`
  };
}

export function resolveTutorialAi(state: TutorialState): TutorialSelectResult {
  if (state.step !== 'ai-turn') {
    return { state, accepted: false, announcement: 'The tutorial is not waiting for AI right now.' };
  }
  const ai = chooseAiMove({
    id: 'tutorial',
    inviteCode: 'TUTOR',
    mode: 'solo',
    status: 'active',
    version: 0,
    board: state.board,
    players: {
      north: { id: 'tutorial-player', tag: 'You', side: 'north', score: state.scores.north },
      south: { id: 'matimato-ai', tag: 'Matimato AI', side: 'south', score: state.scores.south }
    },
    currentTurn: 'south',
    legalTarget: state.legalTarget,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  });
  if (!ai) {
    const finished = { ...state, step: 'finish' as const, completedSteps: completeStep(state.completedSteps, 'ai-turn'), message: 'No legal AI move remains. You are ready for solo.' };
    return { state: finished, accepted: true, completedStep: 'ai-turn', announcement: finished.message };
  }
  const cell = state.board.find((item) => item.row === ai.row && item.col === ai.col)!;
  const next = applyTutorialClaim(state, 'south', cell);
  const finished: TutorialState = {
    ...next,
    step: 'finish',
    completedSteps: completeStep(next.completedSteps, 'ai-turn'),
    message: `Matimato AI claimed ${formatSignedValue(cell.value)}. You are ready for a real solo match.`
  };
  return { state: finished, accepted: true, completedStep: 'ai-turn', announcement: finished.message };
}

export function getSuggestedTutorialCell(state: TutorialState): BoardCell {
  const legal = state.board.filter((cell) => !cell.removed && isLegal(state.legalTarget, cell.row, cell.col, state.board));
  if (state.step === 'negative-risk') return legal.filter((cell) => cell.value < 0).sort((a, b) => b.value - a.value)[0] ?? legal[0];
  return legal.filter((cell) => cell.value > 0).sort((a, b) => b.value - a.value)[0] ?? legal[0];
}

function applyTutorialClaim(state: TutorialState, side: PlayerSide, cell: BoardCell): TutorialState {
  const board = state.board.map((item) => item.row === cell.row && item.col === cell.col ? { ...item, removed: true } : item);
  const legalTarget: LegalTarget = state.legalTarget.axis === 'column' ? { axis: 'row', index: cell.row } : { axis: 'column', index: cell.col };
  return {
    ...state,
    board,
    scores: { ...state.scores, [side]: state.scores[side] + cell.value },
    currentTurn: side === 'north' ? 'south' : 'north',
    legalTarget
  };
}

function advanceAfterPlayerMove(state: TutorialState, completedStep: TutorialStepId): TutorialState {
  const completedSteps = completeStep(state.completedSteps, completedStep);
  if (completedStep === 'first-pick') return { ...state, currentTurn: 'north', step: 'column-target', completedSteps, message: 'Now choose a tile in the highlighted column.' };
  if (completedStep === 'column-target') return { ...state, currentTurn: 'north', step: 'row-target', completedSteps, message: 'The target switched to a row. Choose from that row.' };
  if (completedStep === 'row-target') return { ...state, currentTurn: 'north', step: 'negative-risk', completedSteps, message: 'Choose a legal negative tile to see risk before the bot responds.' };
  if (completedStep === 'negative-risk') return { ...state, currentTurn: 'south', step: 'ai-turn', completedSteps, message: 'Matimato AI is ready to answer from the new target.' };
  return state;
}

function completeStep(steps: TutorialStepId[], step: TutorialStepId): TutorialStepId[] {
  return steps.includes(step) ? steps : [...steps, step];
}

function formatSignedValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
