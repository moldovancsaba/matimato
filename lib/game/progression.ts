import type { BoardProgression, BoardSize, BoardUnlock, BoardUnlockState, OnboardingState, TrainingChoice, XpWallet } from '@/lib/shared/types';

export const BOARD_SIZES = [5, 6, 7, 8, 9] as const satisfies readonly BoardSize[];
export const BOARD_UNLOCK_COSTS: Readonly<Record<Exclude<BoardSize, 5>, number>> = {
  6: 120,
  7: 260,
  8: 520,
  9: 900
};

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === 'number' && BOARD_SIZES.includes(value as BoardSize);
}

export function boardUnlockCost(boardSize: BoardSize): number {
  if (boardSize === 5) return 0;
  return BOARD_UNLOCK_COSTS[boardSize];
}

export function normalizeBoardSize(value: unknown, fallback: BoardSize = 5): BoardSize {
  return isBoardSize(value) ? value : fallback;
}

export function normalizeWallet(input: { xp?: unknown; spendableXp?: unknown; wallet?: Partial<XpWallet> | null }): XpWallet {
  const lifetimeXp = clampXp(input.wallet?.lifetimeXp ?? input.xp);
  const spendableXp = clampXp(input.wallet?.spendableXp ?? input.spendableXp ?? lifetimeXp);
  return { lifetimeXp, spendableXp };
}

export function normalizeBoardUnlocks(input: {
  unlockedBoardSizes?: unknown;
  activeBoardSize?: unknown;
  purchases?: unknown;
  boardUnlocks?: Partial<BoardUnlockState> | null;
}): BoardUnlockState {
  const purchaseRows = Array.isArray(input.boardUnlocks?.purchases)
    ? input.boardUnlocks?.purchases
    : Array.isArray(input.purchases)
      ? input.purchases
      : [];
  const purchases = purchaseRows
    .map(normalizePurchase)
    .filter((row): row is BoardUnlock => Boolean(row))
    .sort((a, b) => a.boardSize - b.boardSize || a.purchasedAt.localeCompare(b.purchasedAt));
  const explicit = Array.isArray(input.boardUnlocks?.unlockedBoardSizes)
    ? input.boardUnlocks?.unlockedBoardSizes
    : Array.isArray(input.unlockedBoardSizes)
      ? input.unlockedBoardSizes
      : [];
  const unlocked = uniqueBoardSizes([5, ...explicit, ...purchases.map((purchase) => purchase.boardSize)]);
  const active = normalizeBoardSize(input.boardUnlocks?.activeBoardSize ?? input.activeBoardSize, 5);
  const activeBoardSize = unlocked.includes(active) ? active : 5;
  const nextUnlock = nextBoardUnlock(unlocked);
  return { unlockedBoardSizes: unlocked, activeBoardSize, nextUnlock, purchases };
}

export function createProgression(input: unknown): BoardProgression {
  const raw = input && typeof input === 'object' ? input as {
    xp?: unknown;
    spendableXp?: unknown;
    wallet?: Partial<XpWallet> | null;
    unlockedBoardSizes?: unknown;
    activeBoardSize?: unknown;
    purchases?: unknown;
    boardUnlocks?: Partial<BoardUnlockState> | null;
  } : {};
  return {
    wallet: normalizeWallet(raw),
    boardUnlocks: normalizeBoardUnlocks(raw)
  };
}

export function nextBoardUnlock(unlockedBoardSizes: readonly BoardSize[]) {
  const highest = Math.max(...unlockedBoardSizes);
  const boardSize = BOARD_SIZES.find((size) => size > highest);
  return boardSize ? { boardSize, costXp: boardUnlockCost(boardSize) } : undefined;
}

export function canPurchaseBoard(input: BoardProgression, boardSize: BoardSize): { ok: true; costXp: number } | { ok: false; code: string; costXp?: number } {
  if (boardSize === 5) return { ok: false, code: 'BOARD_ALREADY_UNLOCKED' };
  if (input.boardUnlocks.unlockedBoardSizes.includes(boardSize)) return { ok: false, code: 'BOARD_ALREADY_UNLOCKED' };
  const next = input.boardUnlocks.nextUnlock;
  if (!next || next.boardSize !== boardSize) return { ok: false, code: 'BOARD_SEQUENCE_LOCKED', costXp: boardUnlockCost(boardSize) };
  if (input.wallet.spendableXp < next.costXp) return { ok: false, code: 'INSUFFICIENT_XP', costXp: next.costXp };
  return { ok: true, costXp: next.costXp };
}

export function applyBoardPurchase(input: BoardProgression, boardSize: BoardSize, actionId: string, purchasedAt = new Date().toISOString()): BoardProgression {
  const existing = input.boardUnlocks.purchases.find((purchase) => purchase.actionId === actionId || purchase.boardSize === boardSize);
  if (existing) return input;
  const result = canPurchaseBoard(input, boardSize);
  if (!result.ok) throw new Error(result.code);
  const purchase: BoardUnlock = { boardSize, costXp: result.costXp, actionId, purchasedAt };
  const unlockedBoardSizes = uniqueBoardSizes([...input.boardUnlocks.unlockedBoardSizes, boardSize]);
  return {
    wallet: {
      lifetimeXp: input.wallet.lifetimeXp,
      spendableXp: Math.max(0, input.wallet.spendableXp - result.costXp)
    },
    boardUnlocks: {
      unlockedBoardSizes,
      activeBoardSize: boardSize,
      nextUnlock: nextBoardUnlock(unlockedBoardSizes),
      purchases: [...input.boardUnlocks.purchases, purchase]
    }
  };
}

export function selectActiveBoard(input: BoardProgression, boardSize: BoardSize): BoardProgression {
  if (!input.boardUnlocks.unlockedBoardSizes.includes(boardSize)) throw new Error('BOARD_LOCKED');
  return { ...input, boardUnlocks: { ...input.boardUnlocks, activeBoardSize: boardSize } };
}

export function shouldShowTrainingChoice(onboarding: OnboardingState | null | undefined, initialMatchId?: string): boolean {
  if (initialMatchId) return false;
  if (!onboarding) return true;
  return !onboarding.completedAt && !onboarding.dismissedAt && !onboarding.trainingChoice;
}

export function isTrainingChoice(value: unknown): value is TrainingChoice {
  return value === 'learn' || value === 'play-now';
}

function uniqueBoardSizes(values: unknown[]): BoardSize[] {
  return BOARD_SIZES.filter((size) => values.includes(size));
}

function normalizePurchase(value: unknown): BoardUnlock | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<BoardUnlock>;
  const boardSize = normalizeBoardSize(raw.boardSize, 5);
  if (boardSize === 5) return null;
  return {
    boardSize,
    costXp: clampXp(raw.costXp),
    purchasedAt: typeof raw.purchasedAt === 'string' ? raw.purchasedAt : new Date(0).toISOString(),
    actionId: typeof raw.actionId === 'string' && raw.actionId ? raw.actionId : `legacy:${boardSize}`
  };
}

function clampXp(value: unknown): number {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.floor(numberValue));
}
