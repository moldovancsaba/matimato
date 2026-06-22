import crypto from "node:crypto";
import { challengeBoard, dailyChallenge } from "../challenges/challenge-model";
import { applyMove, createInitialGameState, finishGame, maybeApplyAiMove } from "../game/engine";
import { toMatchSummary } from "../game/match-summary";
import { toCanonical, toPublicGameDto } from "../game/perspective";
import type { AiDifficulty, GameState, PlayerSlot } from "../game/types";
import { AppError, sanitizeServerMessage } from "./errors";
import { createCredential, hashToken, type PlayerCredential } from "./session";
import { getGameStore } from "./store";

export async function createGameForMode(input: {
  mode: "ai" | "pvp";
  boardSize: number;
  difficulty: AiDifficulty;
  displayName: string;
  profileId?: string;
}) {
  const credential = createCredential();
  const host = humanPlayer(credential, input.displayName, "north", input.profileId);
  const ai = input.mode === "ai" ? aiPlayer() : undefined;
  const game = createInitialGameState({
    id: crypto.randomUUID(),
    code: await createUniqueCode(),
    mode: input.mode,
    boardSize: input.boardSize,
    difficulty: input.difficulty,
    host,
    secondPlayer: ai
  });
  const saved = await getGameStore().create(game);
  return { game: toPublicGameDto(saved, credential.playerId), credential };
}

export async function createChallengeGame(input: { date: string; displayName: string; profileId?: string }) {
  const challenge = dailyChallenge(input.date);
  if (challenge.status !== "active") throw new AppError("CHALLENGE_DISABLED", "This challenge is disabled.", 409);
  const credential = createCredential();
  const host = humanPlayer(credential, input.displayName, "north", input.profileId);
  const ai = aiPlayer();
  const game = {
    ...createInitialGameState({
      id: crypto.randomUUID(),
      code: await createUniqueCode(),
      mode: "ai",
      boardSize: 9,
      difficulty: "standard",
      host,
      secondPlayer: ai
    }),
    challengeDate: input.date,
    board: challengeBoard(input.date)
  };
  const saved = await getGameStore().create(game);
  return { game: toPublicGameDto(saved, credential.playerId), credential };
}

export async function joinGameByCode(input: { code: string; displayName: string; profileId?: string }) {
  const store = getGameStore();
  const game = await store.getByCode(input.code.toUpperCase());
  if (!game) throw new AppError("GAME_NOT_FOUND", "No game exists for that code.", 404);
  if (game.mode !== "pvp") throw new AppError("NOT_JOINABLE", "This game is not a player-to-player game.", 409);
  if (game.players.length >= 2) throw new AppError("GAME_FULL", "This game already has two players.", 409);
  const credential = createCredential();
  const joined: GameState = {
    ...game,
    status: "active",
    players: [...game.players, humanPlayer(credential, input.displayName, "south", input.profileId)],
    scores: { ...game.scores, [credential.playerId]: 0 },
    updatedAt: new Date().toISOString(),
    version: game.version + 1
  };
  const saved = await store.update(joined, game.version);
  return { game: toPublicGameDto(saved, credential.playerId), credential };
}

export async function getGameForViewer(id: string, credential?: PlayerCredential) {
  const game = await requireGame(id);
  await recordTerminalSummary(game);
  return { game: toPublicGameDto(game, credential?.playerId) };
}

export async function applyViewerMove(
  id: string,
  credential: PlayerCredential | undefined,
  input: { viewRow: number; viewCol: number; version: number }
) {
  const store = getGameStore();
  const game = await requireGame(id);
  const player = requirePlayer(game, credential);
  if (game.version !== input.version) {
    throw new AppError("VERSION_CONFLICT", "Game changed. Refresh and try again.", 409, true);
  }
  const canonical = toCanonical(player.side, game.boardSize, input);
  const afterViewerMove = applyMove(game, { playerId: player.playerId, row: canonical.row, col: canonical.col });
  const next = maybeApplyAiMove(afterViewerMove);
  const saved = await store.update(next, game.version);
  await recordTerminalSummary(saved);
  const animationFrames = afterViewerMove.version === saved.version
    ? [toPublicGameDto(saved, player.playerId)]
    : [toPublicGameDto(afterViewerMove, player.playerId), toPublicGameDto(saved, player.playerId)];
  return { game: toPublicGameDto(saved, player.playerId), animationFrames };
}

export async function forfeitGame(id: string, credential?: PlayerCredential) {
  const store = getGameStore();
  const game = await requireGame(id);
  const player = requirePlayer(game, credential);
  if (game.status === "waiting" && game.mode === "pvp") {
    const saved = await store.update({
      ...game,
      status: "abandoned",
      updatedAt: new Date().toISOString(),
      version: game.version + 1
    }, game.version);
    return { game: toPublicGameDto(saved, player.playerId) };
  }
  const saved = await store.update(finishGame(game, "forfeit", player.playerId), game.version);
  await recordTerminalSummary(saved);
  return { game: toPublicGameDto(saved, player.playerId) };
}

async function recordTerminalSummary(game: GameState) {
  const summary = toMatchSummary(game);
  if (!summary) return;
  try {
    await getGameStore().upsertMatchSummary(summary);
    await getGameStore().applyMatchSummaryToProfiles(summary);
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      code: "MATCH_SUMMARY_WRITE_FAILED",
      gameId: game.id,
      message: error instanceof Error ? sanitizeServerMessage(error.message) : "Unknown summary write failure"
    }));
  }
}

function requirePlayer(game: GameState, credential?: PlayerCredential) {
  if (!credential) throw new AppError("SESSION_REQUIRED", "Join or create a game before moving.", 401);
  const player = game.players.find((slot) => slot.playerId === credential.playerId);
  if (!player || player.kind !== "human") throw new AppError("NOT_PLAYER", "You are not a player in this game.", 403);
  if (!player.tokenHash || player.tokenHash !== hashToken(credential.token)) {
    throw new AppError("SESSION_INVALID", "Your player session is no longer valid.", 401);
  }
  return player;
}

async function requireGame(id: string) {
  const game = await getGameStore().get(id);
  if (!game) throw new AppError("GAME_NOT_FOUND", "Game not found.", 404);
  if (Date.parse(game.expiresAt) < Date.now() && game.status !== "finished") {
    return { ...game, status: "expired" as const };
  }
  return game;
}

function humanPlayer(credential: PlayerCredential, displayName: string, side: "north" | "south", profileId?: string): PlayerSlot {
  return {
    playerId: credential.playerId,
    profileId,
    displayName,
    side,
    kind: "human",
    tokenHash: hashToken(credential.token),
    joinedAt: new Date().toISOString()
  };
}

function aiPlayer(): PlayerSlot {
  return {
    playerId: "ai",
    displayName: "Matimato AI",
    side: "south",
    kind: "ai",
    joinedAt: new Date().toISOString()
  };
}

async function createUniqueCode() {
  const store = getGameStore();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = crypto.randomBytes(4).toString("base64url").replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase();
    if (code.length >= 4 && !(await store.getByCode(code))) return code;
  }
  throw new AppError("CODE_GENERATION_FAILED", "Could not create an invite code.", 500, true);
}
