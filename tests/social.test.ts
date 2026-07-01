import { describe, expect, it } from 'vitest';
import { buildGiftLedgerEntry, friendshipIdForPlayers, normalizeFriendTag, relationshipBlocksActions, utcGiftDate } from '@/lib/game/social';
import type { Friendship } from '@/lib/shared/types';

describe('friend graph contracts', () => {
  it('normalizes friendship ids independent of invite order', () => {
    expect(friendshipIdForPlayers('player-a', 'player-b')).toBe(friendshipIdForPlayers('player-b', 'player-a'));
    expect(() => friendshipIdForPlayers('player-a', 'player-a')).toThrow('FRIEND_SELF_NOT_ALLOWED');
  });

  it('caps display tags without changing relationship identity', () => {
    expect(normalizeFriendTag('  Mati   Friend  ')).toBe('Mati Friend');
    expect(normalizeFriendTag('x'.repeat(80))).toHaveLength(40);
  });

  it('uses one gift ledger key per UTC day and sender', () => {
    const now = new Date('2026-07-01T23:59:00.000Z');
    const gift = buildGiftLedgerEntry({ friendshipId: 'friendship-1', senderId: 'a', receiverId: 'b', actionId: 'gift-action', now });
    expect(gift).toMatchObject({
      id: 'friendship-1:a:2026-07-01',
      giftDate: '2026-07-01',
      xpGranted: 15
    });
    expect(utcGiftDate(new Date('2026-07-02T00:01:00.000Z'))).toBe('2026-07-02');
  });

  it('blocks gifts and battles when either side blocks or removes the relationship', () => {
    const friendship: Friendship = {
      id: 'f1',
      playerIds: ['a', 'b'],
      tags: { a: 'A', b: 'B' },
      statusByPlayer: { a: 'active', b: 'blocked' },
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z'
    };
    expect(relationshipBlocksActions(friendship, 'a')).toBe('blocked');
    expect(relationshipBlocksActions({ ...friendship, statusByPlayer: { a: 'removed', b: 'active' } }, 'a')).toBe('removed');
    expect(relationshipBlocksActions({ ...friendship, statusByPlayer: { a: 'active', b: 'active' } }, 'a')).toBeNull();
  });
});
