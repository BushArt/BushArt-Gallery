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

async function getOrCreateClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    // In development, use a global variable so the client survives hot reloads.
    if (!global._mongoClientPromise) {
      const client = new MongoClient(getMongoUri());
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    // In production, create a new client and connect.
    const client = new MongoClient(getMongoUri());
    return client.connect();
  }
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
