import { MongoClient } from "mongodb";
import { getRuntimeConfig } from "../config";
import type { GameState } from "../game/types";
import { AppError } from "./errors";

type GameStore = {
  create(game: GameState): Promise<GameState>;
  get(id: string): Promise<GameState | null>;
  getByCode(code: string): Promise<GameState | null>;
  update(game: GameState, expectedVersion?: number): Promise<GameState>;
};

const memoryGames = new Map<string, GameState>();
let mongoClient: MongoClient | null = null;

export function getGameStore(): GameStore {
  const config = getRuntimeConfig();
  if (config.useMemoryStore) return memoryStore;
  return mongoStore;
}

export async function ensureIndexes() {
  const config = getRuntimeConfig();
  if (config.useMemoryStore) return;
  const collection = await getCollection();
  await collection.createIndex({ code: 1 }, { unique: true });
  await collection.createIndex({ expiresAt: 1 });
  await collection.createIndex({ updatedAt: -1 });
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
  }
};

const mongoStore: GameStore = {
  async create(game) {
    await ensureIndexes();
    await (await getCollection()).insertOne(game);
    return game;
  },
  async get(id) {
    return (await getCollection()).findOne({ id }, { projection: { _id: 0 } }) as Promise<GameState | null>;
  },
  async getByCode(code) {
    return (await getCollection()).findOne({ code: code.toUpperCase() }, { projection: { _id: 0 } }) as Promise<GameState | null>;
  },
  async update(game, expectedVersion) {
    const filter = expectedVersion === undefined ? { id: game.id } : { id: game.id, version: expectedVersion };
    const result = await (await getCollection()).findOneAndReplace(filter, game, {
      projection: { _id: 0 },
      returnDocument: "after"
    });
    if (!result) throw new AppError("VERSION_CONFLICT", "Game changed. Refresh and try again.", 409, true);
    return result as GameState;
  }
};

async function getCollection() {
  const config = getRuntimeConfig();
  if (!config.mongodbUri) throw new AppError("MONGODB_NOT_CONFIGURED", "MongoDB is not configured.", 503, true);
  if (!mongoClient) {
    mongoClient = new MongoClient(config.mongodbUri, { serverSelectionTimeoutMS: 3000 });
  }
  await mongoClient.connect();
  return mongoClient.db(config.mongodbDb).collection<GameState>("games");
}
