import { createHash } from 'node:crypto';
import type { Friendship, FriendshipStatus, GiftLedgerEntry } from '@/lib/shared/types';

export const FRIEND_GIFT_XP = 15;
export const MAX_FRIEND_TAG_LENGTH = 40;

export function normalizeFriendTag(value: string | undefined, fallback = 'Friend'): string {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.slice(0, MAX_FRIEND_TAG_LENGTH);
}

export function friendshipIdForPlayers(playerA: string, playerB: string): string {
  const ids = normalizedPair(playerA, playerB);
  return createHash('sha256').update(ids.join(':')).digest('hex').slice(0, 32);
}

export function publicPlayerHash(playerId: string): string {
  return createHash('sha256').update(playerId).digest('hex').slice(0, 16);
}

export function utcGiftDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function nextUtcGiftReset(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

export function giftLedgerId(friendshipId: string, senderId: string, now = new Date()): string {
  return `${friendshipId}:${senderId}:${utcGiftDate(now)}`;
}

export function normalizedPair(playerA: string, playerB: string): [string, string] {
  const a = playerA.trim();
  const b = playerB.trim();
  if (!a || !b) throw new Error('FRIEND_INVALID_PLAYER');
  if (a === b) throw new Error('FRIEND_SELF_NOT_ALLOWED');
  return [a, b].sort() as [string, string];
}

export function otherFriendPlayer(friendship: Friendship, playerId: string): string {
  const other = friendship.playerIds.find((id) => id !== playerId);
  if (!other) throw new Error('FRIEND_NOT_FOUND');
  return other;
}

export function relationshipBlocksActions(friendship: Friendship, playerId: string): FriendshipStatus | null {
  const playerStatus = friendship.statusByPlayer[playerId] ?? 'active';
  if (playerStatus === 'removed' || playerStatus === 'blocked') return playerStatus;
  const other = otherFriendPlayer(friendship, playerId);
  const otherStatus = friendship.statusByPlayer[other] ?? 'active';
  if (otherStatus === 'blocked') return 'blocked';
  if (otherStatus === 'removed') return 'removed';
  return null;
}

export function buildGiftLedgerEntry(input: {
  friendshipId: string;
  senderId: string;
  receiverId: string;
  actionId: string;
  now?: Date;
}): GiftLedgerEntry {
  const now = input.now ?? new Date();
  return {
    id: giftLedgerId(input.friendshipId, input.senderId, now),
    friendshipId: input.friendshipId,
    senderId: input.senderId,
    receiverId: input.receiverId,
    giftDate: utcGiftDate(now),
    xpGranted: FRIEND_GIFT_XP,
    actionId: input.actionId,
    createdAt: now.toISOString()
  };
}
