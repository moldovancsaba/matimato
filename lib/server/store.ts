import { MongoClient } from "mongodb";
import { getRuntimeConfig } from "../config";
import type { MatchSummary } from "../game/match-summary";
import type { GameState } from "../game/types";
import { AppError, sanitizeServerMessage } from "./errors";

type GameStore = {
  create(game: GameState): Promise<GameState>;
  get(id: string): Promise<GameState | null>;
  getByCode(code: string): Promise<GameState | null>;
  update(game: GameState, expectedVersion?: number): Promise<GameState>;
  upsertMatchSummary(summary: MatchSummary): Promise<void>;
  getMatchSummary(gameId: string): Promise<MatchSummary | null>;
};

const memoryGames = new Map<string, GameState>();
const memorySummaries = new Map<string, MatchSummary>();
let mongoClient: MongoClient | null = null;

export function getGameStore(): GameStore {
  const config = getRuntimeConfig();
  if (config.useMemoryStore) return memoryStore;
  return mongoStore;
}

export async function ensureIndexes() {
  const config = getRuntimeConfig();
  if (config.useMemoryStore) return;
  const games = await getGameCollection();
  await games.createIndex({ code: 1 }, { unique: true });
  await games.createIndex({ expiresAt: 1 });
  await games.createIndex({ updatedAt: -1 });
  const summaries = await getMatchSummaryCollection();
  await summaries.createIndex({ gameId: 1 }, { unique: true });
  await summaries.createIndex({ completedAt: -1 });
  await summaries.createIndex({ mode: 1, completedAt: -1 });
}

export async function checkDatabaseReady() {
  const config = getRuntimeConfig();
  if (config.useMemoryStore) return { ok: true, db: "memory" as const };
  try {
    const collection = await getGameCollection();
    await collection.db.command({ ping: 1 });
    return { ok: true, db: "connected" as const };
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      route: "/api/health",
      code: "DATABASE_HEALTH_FAILED",
      message: error instanceof Error ? sanitizeServerMessage(error.message) : "Unknown database health failure"
    }));
    return { ok: false, db: "down" as const };
  }
}

const memoryStore: GameStore = {
  async create(game) {
    memoryGames.set(game.id, structuredClone(game));
    return structuredClone(game);
  },
  async get(id) {
    const game = memoryGames.get(id);
    return game ? structuredClone(game) : null;
  },
  async getByCode(code) {
    const game = [...memoryGames.values()].find((item) => item.code.toLowerCase() === code.toLowerCase());
    return game ? structuredClone(game) : null;
  },
  async update(game, expectedVersion) {
    const current = memoryGames.get(game.id);
    if (!current) throw new AppError("GAME_NOT_FOUND", "Game not found.", 404);
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new AppError("VERSION_CONFLICT", "Game changed. Refresh and try again.", 409, true);
    }
    memoryGames.set(game.id, structuredClone(game));
    return structuredClone(game);
  },
  async upsertMatchSummary(summary) {
    if (!memorySummaries.has(summary.gameId)) {
      memorySummaries.set(summary.gameId, structuredClone(summary));
    }
  },
  async getMatchSummary(gameId) {
    const summary = memorySummaries.get(gameId);
    return summary ? structuredClone(summary) : null;
  }
};

const mongoStore: GameStore = {
  async create(game) {
    await ensureIndexes();
    await (await getGameCollection()).insertOne(game);
    return game;
  },
  async get(id) {
    return (await getGameCollection()).findOne({ id }, { projection: { _id: 0 } }) as Promise<GameState | null>;
  },
  async getByCode(code) {
    return (await getGameCollection()).findOne({ code: code.toUpperCase() }, { projection: { _id: 0 } }) as Promise<GameState | null>;
  },
  async update(game, expectedVersion) {
    const filter = expectedVersion === undefined ? { id: game.id } : { id: game.id, version: expectedVersion };
    const result = await (await getGameCollection()).findOneAndReplace(filter, game, {
      projection: { _id: 0 },
      returnDocument: "after"
    });
    if (!result) throw new AppError("VERSION_CONFLICT", "Game changed. Refresh and try again.", 409, true);
    return result as GameState;
  },
  async upsertMatchSummary(summary) {
    await ensureIndexes();
    await (await getMatchSummaryCollection()).updateOne(
      { gameId: summary.gameId },
      { $setOnInsert: summary },
      { upsert: true }
    );
  },
  async getMatchSummary(gameId) {
    return (await getMatchSummaryCollection()).findOne({ gameId }, { projection: { _id: 0 } }) as Promise<MatchSummary | null>;
  }
};

async function getGameCollection() {
  const config = getRuntimeConfig();
  if (!config.mongodbUri) throw new AppError("MONGODB_NOT_CONFIGURED", "MongoDB is not configured.", 503, true);
  if (!mongoClient) {
    mongoClient = new MongoClient(config.mongodbUri, { serverSelectionTimeoutMS: 3000 });
  }
  await mongoClient.connect();
  return mongoClient.db(config.mongodbDb).collection<GameState>("games");
}

async function getMatchSummaryCollection() {
  const config = getRuntimeConfig();
  if (!config.mongodbUri) throw new AppError("MONGODB_NOT_CONFIGURED", "MongoDB is not configured.", 503, true);
  if (!mongoClient) {
    mongoClient = new MongoClient(config.mongodbUri, { serverSelectionTimeoutMS: 3000 });
  }
  await mongoClient.connect();
  return mongoClient.db(config.mongodbDb).collection<MatchSummary>("match_summaries");
}
