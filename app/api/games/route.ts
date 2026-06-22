import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { applyMove, chooseAiMove, joinBattle, newGame, sideForPlayer } from '@/lib/game/rules';
import { completeGame, findGame, findGameByInvite, saveGame } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';
import type { GameApiResponse, GameMode, MoveFrame } from '@/lib/shared/types';

const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), mode: z.enum(['solo', 'battle', 'daily']), playerId: z.string().min(1), playerTag: z.string().min(1) }),
  z.object({ type: z.literal('join'), inviteCode: z.string().min(3), playerId: z.string().min(1), playerTag: z.string().min(1) }),
  z.object({ type: z.literal('move'), matchId: z.string().min(1), playerId: z.string().min(1), actionId: z.string().min(1), row: z.number().int().min(0).max(8), col: z.number().int().min(0).max(8), expectedVersion: z.number().int().min(0) }),
  z.object({ type: z.literal('sync'), matchId: z.string().min(1), playerId: z.string().optional() })
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
  return { snapshot: next, frames };
}

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new Error('Missing game id.');
    const snapshot = await findGame(id);
    if (!snapshot) throw new Error('Game not found.');
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
      const snapshot = newGame(randomUUID(), input.mode as GameMode, input.playerId, input.playerTag);
      await saveGame(snapshot);
      return ok({ snapshot } satisfies GameApiResponse);
    }
    if (input.type === 'join') {
      const existing = await findGameByInvite(input.inviteCode);
      if (!existing) throw new Error('Battle code not found.');
      const snapshot = joinBattle(existing, input.playerId, input.playerTag);
      await saveGame(snapshot);
      return ok({ snapshot } satisfies GameApiResponse);
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
    const snapshot = await findGame(input.matchId);
    if (!snapshot) throw new Error('Game not found.');
    if (input.expectedVersion !== snapshot.version) throw new Error('Game state changed. Refreshing required.');
    const side = sideForPlayer(snapshot, input.playerId);
    if (!side) throw new Error('Player is not in this game.');
    const frames: MoveFrame[] = [];
    let result = applyMove(snapshot, side, input.row, input.col, input.actionId);
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
