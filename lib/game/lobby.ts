import type { GameSnapshot, LobbyState, PlayerSide } from '@/lib/shared/types';
import { createPlayer, sideForPlayer } from './rules';

const LOBBY_TTL_MS = 30 * 60 * 1000;

export function createLobby(snapshot: GameSnapshot, now = new Date()): LobbyState {
  return {
    matchId: snapshot.id,
    inviteCode: snapshot.inviteCode,
    status: 'waiting',
    ready: { north: false },
    expiresAt: new Date(now.getTime() + LOBBY_TTL_MS).toISOString(),
    lastSeenAt: { north: now.toISOString() }
  };
}

export function refreshLobby(snapshot: GameSnapshot, playerId?: string, now = new Date()): GameSnapshot {
  if (!snapshot.lobby) return snapshot;
  const side = playerId ? sideForPlayer(snapshot, playerId) : null;
  const nextLobby: LobbyState = {
    ...snapshot.lobby,
    status: resolveLobbyStatus(snapshot, now),
    lastSeenAt: side ? { ...snapshot.lobby.lastSeenAt, [side]: now.toISOString() } : snapshot.lobby.lastSeenAt
  };
  return { ...snapshot, lobby: nextLobby, updatedAt: now.toISOString() };
}

export function joinLobby(snapshot: GameSnapshot, playerId: string, tag: string, now = new Date()): GameSnapshot {
  if (snapshot.mode !== 'battle') throw new Error('Only battle games can be joined.');
  const currentSide = sideForPlayer(snapshot, playerId);
  if (currentSide) return refreshLobby(snapshot, playerId, now);
  if (snapshot.players.south && snapshot.players.south.id !== playerId) throw new Error('Battle already has two players.');
  const refreshed = refreshLobby(snapshot, undefined, now);
  if (refreshed.lobby?.status === 'expired') throw new Error('Battle lobby expired.');
  if (refreshed.lobby?.status === 'cancelled') throw new Error('Battle lobby cancelled.');
  if (!refreshed.lobby) return snapshot;
  return {
    ...refreshed,
    status: 'waiting',
    players: { ...refreshed.players, south: createPlayer(playerId, tag, 'south') },
    lobby: {
      ...refreshed.lobby,
      status: 'waiting',
      ready: { ...refreshed.lobby.ready, south: false },
      lastSeenAt: { ...refreshed.lobby.lastSeenAt, south: now.toISOString() }
    },
    updatedAt: now.toISOString()
  };
}

export function markLobbyReady(snapshot: GameSnapshot, playerId: string, now = new Date()): GameSnapshot {
  const lobby = requireLobby(snapshot);
  const side = requireLobbySide(snapshot, playerId);
  const refreshed = refreshLobby(snapshot, playerId, now);
  if (refreshed.lobby?.status === 'expired') throw new Error('Battle lobby expired.');
  if (refreshed.lobby?.status === 'cancelled') throw new Error('Battle lobby cancelled.');
  const ready = { ...lobby.ready, [side]: true };
  const bothReady = Boolean(refreshed.players.north && refreshed.players.south && ready.north && ready.south);
  const status = bothReady ? 'active' : 'ready';
  return {
    ...refreshed,
    status: bothReady ? 'active' : 'waiting',
    lobby: { ...refreshed.lobby!, ready, status, lastSeenAt: { ...refreshed.lobby!.lastSeenAt, [side]: now.toISOString() } },
    updatedAt: now.toISOString()
  };
}

export function leaveLobby(snapshot: GameSnapshot, playerId: string, now = new Date()): GameSnapshot {
  requireLobby(snapshot);
  const side = requireLobbySide(snapshot, playerId);
  if (side === 'north') return cancelLobby(snapshot, playerId, now);
  const refreshed = refreshLobby(snapshot, playerId, now);
  return {
    ...refreshed,
    status: 'waiting',
    players: { ...refreshed.players, south: null },
    lobby: {
      ...refreshed.lobby!,
      status: 'waiting',
      ready: { north: refreshed.lobby!.ready.north ?? false, south: false },
      lastSeenAt: { ...refreshed.lobby!.lastSeenAt, south: now.toISOString() }
    },
    updatedAt: now.toISOString()
  };
}

export function cancelLobby(snapshot: GameSnapshot, playerId: string, now = new Date()): GameSnapshot {
  requireLobby(snapshot);
  const side = requireLobbySide(snapshot, playerId);
  if (side !== 'north') throw new Error('Only the battle creator can cancel this lobby.');
  return {
    ...snapshot,
    lobby: {
      ...snapshot.lobby!,
      status: 'cancelled',
      cancelledAt: now.toISOString(),
      lastSeenAt: { ...snapshot.lobby!.lastSeenAt, [side]: now.toISOString() }
    },
    updatedAt: now.toISOString()
  };
}

function resolveLobbyStatus(snapshot: GameSnapshot, now: Date): LobbyState['status'] {
  const lobby = snapshot.lobby;
  if (!lobby) return snapshot.status === 'active' ? 'active' : 'waiting';
  if (lobby.status === 'cancelled' || lobby.cancelledAt) return 'cancelled';
  if (snapshot.status === 'active') return 'active';
  if (Date.parse(lobby.expiresAt) <= now.getTime()) return 'expired';
  if (lobby.ready.north || lobby.ready.south) return 'ready';
  return 'waiting';
}

function requireLobby(snapshot: GameSnapshot): LobbyState {
  if (!snapshot.lobby) throw new Error('Battle lobby is not enabled for this match.');
  return snapshot.lobby;
}

function requireLobbySide(snapshot: GameSnapshot, playerId: string): PlayerSide {
  const side = sideForPlayer(snapshot, playerId);
  if (!side) throw new Error('Player is not in this lobby.');
  return side;
}
