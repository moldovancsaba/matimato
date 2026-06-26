import { describe, expect, it } from 'vitest';
import { applySeasonAction, buildActiveSeasonState, buildBadgeAlbum, claimSeasonReward, createSeasonProgress } from '@/lib/game/seasons';

describe('seasonal collection progression', () => {
  it('records authoritative actions idempotently and unlocks badges', () => {
    const first = applySeasonAction(createSeasonProgress('p1'), { playerId: 'p1', source: 'solo', metric: 'complete_match', actionId: 'match-1' }, new Date('2026-06-26T10:00:00.000Z'));
    const duplicate = applySeasonAction(first, { playerId: 'p1', source: 'solo', metric: 'complete_match', actionId: 'match-1' }, new Date('2026-06-26T10:00:01.000Z'));
    expect(duplicate.taskProgress['finish-matches']).toBe(1);
    expect(duplicate.collectedIds).toContain('first-claim');
  });

  it('builds badge album and claimable rewards from progress', () => {
    let progress = createSeasonProgress('p1');
    progress = applySeasonAction(progress, { playerId: 'p1', source: 'solo', metric: 'complete_match', actionId: 'match-1' }, new Date('2026-06-26T10:00:00.000Z'));
    const state = buildActiveSeasonState('p1', progress, new Date('2026-06-26T10:00:02.000Z'));
    expect(state?.points).toBe(12);
    expect(buildBadgeAlbum(state)?.badges.find((badge) => badge.collectibleId === 'first-claim')?.state).toBe('collected');
    const claim = claimSeasonReward(progress, 'p1', 'starter-cache', new Date('2026-06-26T10:00:03.000Z'));
    expect(claim.newlyClaimed).toBe(true);
    expect(claim.reward.xp).toBe(40);
    const duplicateClaim = claimSeasonReward(claim.state.progress, 'p1', 'starter-cache', new Date('2026-06-26T10:00:04.000Z'));
    expect(duplicateClaim.newlyClaimed).toBe(false);
  });
});
