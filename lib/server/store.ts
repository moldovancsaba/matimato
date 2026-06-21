import { MongoClient } from "mongodb";
import { getRuntimeConfig } from "../config";
import type { MatchSummary } from "../game/match-summary";
import type { GameState } from "../game/types";
import { applySummaryToProfile } from "../profile/profile-model";
import type { Profile } from "../profile/types";
import { AppError, sanitizeServerMessage } from "./errors";

type GameStore = {
  create(game: GameState): Promise<GameState>;
  get(id: string): Promise<GameState | null>;
  getByCode(code: string): Promise<GameState | null>;
  update(game: GameState, expectedVersion?: number): Promise<GameState>;
  upsertMatchSummary(summary: MatchSummary): Promise<void>;
  getMatchSummary(gameId: string): Promise<MatchSummary | null>;
  listMatchSummariesByProfile(input: { profileId: string; mode?: "ai" | "pvp"; cursor?: string; limit: number }): Promise<{ summaries: MatchSummary[]; nextCursor: string | null }>;
  listMatchSummariesForLeaderboard(input: { mode: "ai" | "pvp"; completedAfter?: string; limit: number }): Promise<MatchSummary[]>;
  listChallengeSummaries(input: { date: string; limit: number }): Promise<MatchSummary[]>;
  createProfile(profile: Profile): Promise<Profile>;
  getProfile(id: string): Promise<Profile | null>;
  updateProfile(profile: Profile): Promise<Profile>;
  applyMatchSummaryToProfiles(summary: MatchSummary): Promise<void>;
};

const memoryGames = new Map<string, GameState>();
const memorySummaries = new Map<string, MatchSummary>();
const memoryProfiles = new Map<string, Profile>();
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
  await summaries.createIndex({ "participants.profileId": 1, completedAt: -1 });
  await summaries.createIndex({ challengeDate: 1, completedAt: -1 });
  const profiles = await getProfileCollection();
  await profiles.createIndex({ id: 1 }, { unique: true });
  await profiles.createIndex({ lastActiveAt: -1 });
}

export async function checkDatabaseReady() {
  const config = getRuntimeConfig();
  if (config.useMemoryStore) return { ok: true, db: "memory" as const };
  try {
    const collection = await getGameCollection();
    await collection.db.command({ ping: 1 });
    await ensureIndexes();
    return { ok: true, db: "connected" as const, indexes: "ready" as const };
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      route: "/api/health",
      code: "DATABASE_HEALTH_FAILED",
      message: error instanceof Error ? sanitizeServerMessage(error.message) : "Unknown database health failure"
    }));
    return { ok: false, db: "down" as const, indexes: "unknown" as const };
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
  },
  async listMatchSummariesByProfile(input) {
    const offset = decodeOffset(input.cursor);
    const filtered = [...memorySummaries.values()]
      .filter((summary) => summary.participants.some((participant) => participant.profileId === input.profileId))
      .filter((summary) => !input.mode || summary.mode === input.mode)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const summaries = filtered.slice(offset, offset + input.limit).map((summary) => structuredClone(summary));
    const nextOffset = offset + summaries.length;
    return { summaries, nextCursor: nextOffset < filtered.length ? encodeOffset(nextOffset) : null };
  },
  async listMatchSummariesForLeaderboard(input) {
    return [...memorySummaries.values()]
      .filter((summary) => summary.mode === input.mode)
      .filter((summary) => !input.completedAfter || summary.completedAt >= input.completedAfter)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, input.limit)
      .map((summary) => structuredClone(summary));
  },
  async listChallengeSummaries(input) {
    return [...memorySummaries.values()]
      .filter((summary) => summary.challengeDate === input.date)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, input.limit)
      .map((summary) => structuredClone(summary));
  },
  async createProfile(profile) {
    memoryProfiles.set(profile.id, structuredClone(profile));
    return structuredClone(profile);
  },
  async getProfile(id) {
    const profile = memoryProfiles.get(id);
    return profile ? structuredClone(profile) : null;
  },
  async updateProfile(profile) {
    memoryProfiles.set(profile.id, structuredClone(profile));
    return structuredClone(profile);
  },
  async applyMatchSummaryToProfiles(summary) {
    const profileIds = summary.participants.map((participant) => participant.profileId).filter((value): value is string => Boolean(value));
    for (const profileId of profileIds) {
      const current = memoryProfiles.get(profileId);
      if (current) memoryProfiles.set(profileId, applySummaryToProfile(current, summary));
    }
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
  },
  async listMatchSummariesByProfile(input) {
    const offset = decodeOffset(input.cursor);
    const query = {
      "participants.profileId": input.profileId,
      ...(input.mode ? { mode: input.mode } : {})
    };
    const summaries = await (await getMatchSummaryCollection())
      .find(query, { projection: { _id: 0 } })
      .sort({ completedAt: -1, gameId: 1 })
      .skip(offset)
      .limit(input.limit + 1)
      .toArray();
    const page = summaries.slice(0, input.limit);
    return { summaries: page, nextCursor: summaries.length > input.limit ? encodeOffset(offset + page.length) : null };
  },
  async listMatchSummariesForLeaderboard(input) {
    const query = {
      mode: input.mode,
      ...(input.completedAfter ? { completedAt: { $gte: input.completedAfter } } : {})
    };
    return (await getMatchSummaryCollection())
      .find(query, { projection: { _id: 0 } })
      .sort({ completedAt: -1 })
      .limit(input.limit)
      .toArray();
  },
  async listChallengeSummaries(input) {
    return (await getMatchSummaryCollection())
      .find({ challengeDate: input.date }, { projection: { _id: 0 } })
      .sort({ completedAt: -1 })
      .limit(input.limit)
      .toArray();
  },
  async createProfile(profile) {
    await ensureIndexes();
    await (await getProfileCollection()).insertOne(profile);
    return profile;
  },
  async getProfile(id) {
    return (await getProfileCollection()).findOne({ id }, { projection: { _id: 0 } }) as Promise<Profile | null>;
  },
  async updateProfile(profile) {
    const result = await (await getProfileCollection()).findOneAndReplace({ id: profile.id }, profile, {
      projection: { _id: 0 },
      returnDocument: "after"
    });
    if (!result) throw new AppError("PROFILE_NOT_FOUND", "Profile not found.", 404);
    return result as Profile;
  },
  async applyMatchSummaryToProfiles(summary) {
    const profileIds = summary.participants.map((participant) => participant.profileId).filter((value): value is string => Boolean(value));
    for (const profileId of profileIds) {
      const current = await this.getProfile(profileId);
      if (current) await this.updateProfile(applySummaryToProfile(current, summary));
    }
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

async function getProfileCollection() {
  const config = getRuntimeConfig();
  if (!config.mongodbUri) throw new AppError("MONGODB_NOT_CONFIGURED", "MongoDB is not configured.", 503, true);
  if (!mongoClient) {
    mongoClient = new MongoClient(config.mongodbUri, { serverSelectionTimeoutMS: 3000 });
  }
  await mongoClient.connect();
  return mongoClient.db(config.mongodbDb).collection<Profile>("profiles");
}

function encodeOffset(offset: number) {
  return Buffer.from(String(offset)).toString("base64url");
}

function decodeOffset(cursor?: string) {
  if (!cursor) return 0;
  const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
