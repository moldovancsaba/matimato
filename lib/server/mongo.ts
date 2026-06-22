import { MongoClient } from 'mongodb';

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Missing MONGODB_URI environment variable.');
  clientPromise ??= new MongoClient(uri).connect();
  return clientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB || 'matimato');
}
