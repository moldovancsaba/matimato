import type { BoardCell, GameSnapshot, LegalTarget } from '@/lib/shared/types';

export type RulesHelpTopicId = 'objective' | 'turns' | 'legal-moves' | 'scoring' | 'traps' | 'xp' | 'boards' | 'recap' | 'ranks';

export type RulesHelpTopic = {
  topicId: RulesHelpTopicId;
  title: string;
  summary: string;
  bullets: string[];
  relatedTopicIds: RulesHelpTopicId[];
};

export type ContextualHint = {
  hintId: string;
  severity: 'info' | 'warning' | 'blocked';
  title: string;
  body: string;
  relatedTopicId: RulesHelpTopicId;
  canContinue: boolean;
};

export const RULES_HELP_TOPICS: RulesHelpTopic[] = [
  {
    topicId: 'objective',
    title: 'Objective',
    summary: 'Finish with more points than the rival.',
    bullets: ['Pick one legal tile per turn.', 'Green values add points; red values subtract points.', 'The match ends when the board is empty or no legal cells remain.'],
    relatedTopicIds: ['scoring', 'legal-moves']
  },
  {
    topicId: 'turns',
    title: 'Turn flow',
    summary: 'Every pick hands the next player a row or column target.',
    bullets: ['The first move can use any open tile.', 'A column target becomes a row target after the move.', 'A row target becomes a column target after the move.'],
    relatedTopicIds: ['legal-moves', 'traps']
  },
  {
    topicId: 'legal-moves',
    title: 'Legal moves',
    summary: 'Only open cells in the highlighted row or column can be played.',
    bullets: ['Any target means every open tile is legal.', 'Column target means the selected cell must be in that column.', 'Row target means the selected cell must be in that row.'],
    relatedTopicIds: ['turns', 'scoring']
  },
  {
    topicId: 'scoring',
    title: 'Scoring',
    summary: 'Your score changes by the exact value on the tile you claim.',
    bullets: ['Positive tiles increase your score.', 'Negative tiles reduce your score.', 'A small negative can still be useful if it gives the rival a worse target.'],
    relatedTopicIds: ['traps', 'objective']
  },
  {
    topicId: 'traps',
    title: 'Traps',
    summary: 'Negative cells and narrow targets create risk.',
    bullets: ['Avoid giving away a row or column full of easy positives.', 'Sometimes you accept a red tile to block a bigger swing.', 'No legal cells ends the match immediately.'],
    relatedTopicIds: ['legal-moves', 'scoring']
  },
  {
    topicId: 'xp',
    title: 'XP',
    summary: 'XP rewards progression and unlocks larger boards.',
    bullets: ['Lifetime XP tracks all rewards earned.', 'Spendable XP is used for board unlocks.', 'Claimed seasonal rewards add XP once.'],
    relatedTopicIds: ['boards']
  },
  {
    topicId: 'boards',
    title: 'Board journey',
    summary: 'You start on 5x5 and unlock 6x6 through 9x9 in order.',
    bullets: ['Larger boards add more choices and longer target chains.', 'Each board must be bought before the next one is available.', 'The active board is used for solo and Blitz.'],
    relatedTopicIds: ['xp']
  },
  {
    topicId: 'recap',
    title: 'Recap',
    summary: 'Recap replays the match path after completion.',
    bullets: ['Replay shows each claimed cell in order.', 'Share recap can advance seasonal tasks.', 'Rematch starts the same mode again when available.'],
    relatedTopicIds: ['scoring', 'traps']
  },
  {
    topicId: 'ranks',
    title: 'Ranks',
    summary: 'Ranks compare XP, wins, and daily challenge results.',
    bullets: ['Profile XP drives the main rank list.', 'Daily challenge has a weekly board.', 'Tie-breaks favor stronger score and earlier completions where supported.'],
    relatedTopicIds: ['xp', 'boards']
  }
];

export function topicForScreen(screen: string): RulesHelpTopicId {
  if (screen === 'journey') return 'boards';
  if (screen === 'quests') return 'xp';
  if (screen === 'ranks') return 'ranks';
  if (screen === 'history' || screen === 'recap') return 'recap';
  if (screen === 'profile') return 'xp';
  return 'objective';
}

export function deriveContextualHint(snapshot?: Pick<GameSnapshot, 'board' | 'legalTarget' | 'currentTurn' | 'boardSize'> | null): ContextualHint {
  if (!snapshot) return info('Open a match to see live move help.', 'Rules are still available here.', 'objective');
  const legal = legalCells(snapshot.board, snapshot.legalTarget);
  if (!legal.length) return { hintId: 'no-legal-cells', severity: 'blocked', title: 'No legal cells remain.', body: 'The current row or column has no playable cells, so the match is ready to end.', relatedTopicId: 'recap', canContinue: false };
  const negatives = legal.filter((cell) => cell.value < 0).length;
  const positives = legal.filter((cell) => cell.value > 0);
  const best = [...legal].sort((a, b) => b.value - a.value || a.row - b.row || a.col - b.col)[0];
  if (!positives.length) return { hintId: 'all-negative-target', severity: 'warning', title: 'Only red tiles are legal.', body: `${targetLabel(snapshot.legalTarget)} has ${legal.length} open cells, but every option costs points. Pick the smallest loss or force a worse target.`, relatedTopicId: 'traps', canContinue: true };
  if (negatives && positives.length === 1) return { hintId: 'one-positive-target', severity: 'warning', title: 'One safe score is available.', body: `The best visible tile is ${signedValue(best.value)} at row ${best.row + 1}, column ${best.col + 1}. Watch the target it gives back.`, relatedTopicId: 'scoring', canContinue: true };
  return info('Follow the legal target.', `${targetLabel(snapshot.legalTarget)} has ${legal.length} choices. The highest visible value is ${signedValue(best.value)}.`, 'legal-moves');
}

function legalCells(board: BoardCell[], target: LegalTarget): BoardCell[] {
  return board.filter((cell) => {
    if (cell.removed) return false;
    if (target.axis === 'any') return true;
    if (target.axis === 'row') return cell.row === target.index;
    return cell.col === target.index;
  });
}

function targetLabel(target: LegalTarget): string {
  if (target.axis === 'any') return 'Any open tile';
  return `${target.axis === 'row' ? 'Row' : 'Column'} ${target.index + 1}`;
}

function signedValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function info(title: string, body: string, relatedTopicId: RulesHelpTopicId): ContextualHint {
  return { hintId: `info-${relatedTopicId}`, severity: 'info', title, body, relatedTopicId, canContinue: true };
}
