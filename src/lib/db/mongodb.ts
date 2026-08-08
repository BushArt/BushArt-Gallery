import { MongoClient, Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Set it in .env.local or your runtime environment.",
    );
  }
  return uri;
}

let cachedClientPromise: Promise<MongoClient> | null = null;

async function getOrCreateClient(): Promise<MongoClient> {
  if (!cachedClientPromise) {
    const client = new MongoClient(getMongoUri());
    cachedClientPromise = client.connect();
  }
  return cachedClientPromise;
}

/**
 * Returns a connected MongoClient, reusing a cached instance across hot
 * reloads in development and across module scopes in production.
 *
 * @throws If MONGODB_URI is missing at call time.
 */
export async function getClient(): Promise<MongoClient> {
  return getOrCreateClient();
}

/**
 * Returns the application database handle.
 *
 * @param dbName - Optional explicit database name. Defaults to the database
 *   specified in `MONGODB_URI` (or `"bushart"` if none is present in the URI).
 */
export async function getDb(dbName?: string): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}
