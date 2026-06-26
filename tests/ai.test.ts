import { describe, expect, it } from 'vitest';
import { availableBotProfiles, chooseProfiledBotMove, getBotProfile } from '@/lib/game/ai';
import { newGame } from '@/lib/game/rules';

describe('bot opponent profiles', () => {
  it('gates profiles by board size and falls back to rookie when locked', () => {
    expect(availableBotProfiles(5).map((profile) => profile.profileId)).toEqual(['rookie-guide']);
    expect(availableBotProfiles(8).map((profile) => profile.profileId)).toContain('expert-lock');
    expect(getBotProfile('expert-lock', 5).profileId).toBe('rookie-guide');
  });

  it('chooses deterministic legal moves for the selected profile', () => {
    const game = newGame('ai-game', 'solo', 'p1', 'Player', { boardSize: 7, botProfileId: 'sharp-cutter' });
    const first = chooseProfiledBotMove({ ...game, currentTurn: 'south', legalTarget: { axis: 'row', index: 2 } }, 'sharp-cutter', 'seed-1');
    const second = chooseProfiledBotMove({ ...game, currentTurn: 'south', legalTarget: { axis: 'row', index: 2 } }, 'sharp-cutter', 'seed-1');
    expect(first).toMatchObject({ profile: expect.objectContaining({ profileId: 'sharp-cutter' }) });
    expect(first?.row).toBe(2);
    expect(second?.row).toBe(first?.row);
    expect(second?.col).toBe(first?.col);
  });
});
