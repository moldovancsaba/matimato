import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createDailyChallenge, isValidTodayDailyId } from '@/lib/game/daily';
import { cancelLobby, createLobby, joinLobby, leaveLobby, markLobbyReady, refreshLobby } from '@/lib/game/lobby';
import { applyMove, chooseAiMove, computeOutcome, joinBattle, newGame, sideForPlayer } from '@/lib/game/rules';
import { completeGame, findActiveDailyGame, findDailyResult, findGame, findGameByInvite, saveGame } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';
import type { GameApiResponse, GameMode, MoveFrame } from '@/lib/shared/types';

const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), mode: z.enum(['solo', 'battle', 'daily']), playerId: z.string().min(1), playerTag: z.string().min(1), lobbyVersion: z.literal(2).optional(), dailyId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  z.object({ type: z.literal('join'), inviteCode: z.string().min(3), playerId: z.string().min(1), playerTag: z.string().min(1) }),
  z.object({ type: z.literal('move'), matchId: z.string().min(1), playerId: z.string().min(1), actionId: z.string().min(1), row: z.number().int().min(0).max(8), col: z.number().int().min(0).max(8), expectedVersion: z.number().int().min(0) }),
  z.object({ type: z.literal('sync'), matchId: z.string().min(1), playerId: z.string().optional() }),
  z.object({ type: z.literal('lobbyStatus'), matchId: z.string().min(1), playerId: z.string().min(1) }),
  z.object({ type: z.literal('ready'), matchId: z.string().min(1), playerId: z.string().min(1), actionId: z.string().min(1) }),
  z.object({ type: z.literal('leave'), matchId: z.string().min(1), playerId: z.string().min(1), actionId: z.string().min(1) }),
  z.object({ type: z.literal('cancel'), matchId: z.string().min(1), playerId: z.string().min(1), actionId: z.string().min(1) })
]);


function resolveAutomatedTurns(snapshot: import('@/lib/shared/types').GameSnapshot, actionSeed = 'auto-sync') {
  const frames: MoveFrame[] = [];
  let next = snapshot;
  let guard = 0;
  while (!next.outcome && next.status === 'active' && next.mode !== 'battle' && next.currentTurn === 'south' && guard < 8) {
    const ai = chooseAiMove(next);
    if (!ai) break;
    const result = applyMove(next, 'south', ai.row, ai.col, `${actionSeed}:ai:${guard}`);
    frames.push(result.frame);
    next = result.snapshot;
    guard += 1;
  }
  const scores = { north: next.players.north?.score ?? 0, south: next.players.south?.score ?? 0 };
  const outcome = next.outcome ?? computeOutcome(next.board, next.legalTarget, scores);
  if (outcome && next.status !== 'complete') {
    next = { ...next, outcome, status: 'complete', updatedAt: new Date().toISOString() };
  }
  return { snapshot: next, frames };
}

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new Error('Missing game id.');
    const snapshot = await findGame(id);
    if (!snapshot) throw new Error('Game not found.');
    if (snapshot.lobby && snapshot.status === 'waiting') {
      const refreshed = refreshLobby(snapshot);
      if (refreshed.updatedAt !== snapshot.updatedAt || refreshed.lobby?.status !== snapshot.lobby.status) await saveGame(refreshed);
      return ok({ snapshot: refreshed, lobby: refreshed.lobby! } satisfies GameApiResponse);
    }
    const resolved = resolveAutomatedTurns(snapshot, 'fetch');
    if (resolved.frames.length) {
      await saveGame(resolved.snapshot);
      if (resolved.snapshot.outcome) await completeGame(resolved.snapshot);
    }
    return ok({ snapshot: resolved.snapshot, frames: resolved.frames } satisfies GameApiResponse);
  } catch (error) {
    return fail(error, 404);
  }
}

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (input.type === 'create') {
      if (input.mode === 'daily') {
        if (!isValidTodayDailyId(input.dailyId)) throw new Error('Daily challenge is not available.');
        const daily = createDailyChallenge();
        const completedDaily = await findDailyResult(input.playerId, daily.id);
        if (completedDaily) throw new Error('Daily challenge already completed.');
        const existingDaily = await findActiveDailyGame(input.playerId, daily.id);
        if (existingDaily) return ok({ snapshot: existingDaily } satisfies GameApiResponse);
        const snapshot = newGame(randomUUID(), 'daily', input.playerId, input.playerTag, { boardSeed: daily.seed, dailyId: daily.id });
        await saveGame(snapshot);
        return ok({ snapshot } satisfies GameApiResponse);
      }
      let snapshot = newGame(randomUUID(), input.mode as GameMode, input.playerId, input.playerTag);
      if (input.mode === 'battle' && input.lobbyVersion === 2) snapshot = { ...snapshot, lobby: createLobby(snapshot) };
      await saveGame(snapshot);
      return ok((snapshot.lobby ? { snapshot, lobby: snapshot.lobby } : { snapshot }) satisfies GameApiResponse);
    }
    if (input.type === 'join') {
      const existing = await findGameByInvite(input.inviteCode);
      if (!existing) throw new Error('Battle code not found.');
      const snapshot = existing.lobby ? joinLobby(existing, input.playerId, input.playerTag) : joinBattle(existing, input.playerId, input.playerTag);
      await saveGame(snapshot);
      return ok((snapshot.lobby ? { snapshot, lobby: snapshot.lobby } : { snapshot }) satisfies GameApiResponse);
    }
    if (input.type === 'sync') {
      const snapshot = await findGame(input.matchId);
      if (!snapshot) throw new Error('Game not found.');
      const resolved = resolveAutomatedTurns(snapshot, 'sync');
      if (resolved.frames.length) {
        await saveGame(resolved.snapshot);
        if (resolved.snapshot.outcome) await completeGame(resolved.snapshot);
      }
      return ok({ snapshot: resolved.snapshot, frames: resolved.frames } satisfies GameApiResponse);
    }
    if (input.type === 'lobbyStatus' || input.type === 'ready' || input.type === 'leave' || input.type === 'cancel') {
      const snapshot = await findGame(input.matchId);
      if (!snapshot) throw new Error('Game not found.');
      let next = refreshLobby(snapshot, input.playerId);
      if (input.type === 'ready') next = markLobbyReady(next, input.playerId);
      if (input.type === 'leave') next = leaveLobby(next, input.playerId);
      if (input.type === 'cancel') next = cancelLobby(next, input.playerId);
      await saveGame(next);
      return ok({ snapshot: next, lobby: next.lobby! } satisfies GameApiResponse);
    }
    const snapshot = await findGame(input.matchId);
    if (!snapshot) throw new Error('Game not found.');
    if (input.expectedVersion !== snapshot.version) throw new Error('Game state changed. Refreshing required.');
    const side = sideForPlayer(snapshot, input.playerId);
    if (!side) throw new Error('Player is not in this game.');
    const frames: MoveFrame[] = [];
    const result = applyMove(snapshot, side, input.row, input.col, input.actionId);
    frames.push(result.frame);
    let next = result.snapshot;
    const automated = resolveAutomatedTurns(next, input.actionId);
    frames.push(...automated.frames);
    next = automated.snapshot;
    await saveGame(next);
    if (next.outcome) await completeGame(next);
    return ok({ snapshot: next, frames } satisfies GameApiResponse);
  } catch (error) {
    return fail(error);
  }
}
