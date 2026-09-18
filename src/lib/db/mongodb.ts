import { connection } from "next/server";
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
    const client = new MongoClient(getMongoUri(), {
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 10_000,
    });
    cachedClientPromise = client.connect().catch(async (error) => {
      cachedClientPromise = null;
      await client.close().catch(() => undefined);
      throw error;
    });
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
 * Extracts the database name from a MongoDB connection string's path, if one
 * is present. Exported so standalone scripts share the app's defaulting rule.
 */
export function getUriDbName(uri?: string): string | undefined {
  const value = uri ?? process.env.MONGODB_URI ?? "";
  // Strip credentials-agnostic authority: scheme://[userinfo@]host/...,
  // then take the first path segment before ? or /. Trailing slash => none.
  const noScheme = value.replace(/^mongodb(?:\+srv)?:\/\//, "");
  const slash = noScheme.indexOf("/");
  if (slash === -1) return undefined;
  const path = noScheme.slice(slash + 1).split("?")[0].split("/")[0].trim();
  return path || undefined;
}

/**
 * Returns the application database handle.
 *
 * @param dbName - Optional explicit database name. Defaults to the database
 *   specified in `MONGODB_URI`, falling back to `"bushart"` if the URI has no
 *   database in its path. (The MongoDB driver's own implicit default is
 *   `"test"`, which is not the app's database — never rely on it.)
 */
export async function getDb(dbName?: string): Promise<Db> {
  // Opt into dynamic rendering before MongoDB I/O (driver uses Date internally).
  // Outside a Next request scope (e.g. the db-setup / seed-admin scripts) this
  // throws a Next.js "outside a request scope" error, which is harmless there.
  // Only that case is swallowed; every other connection() failure is rethrown
  // so real dynamic-API misuse is never hidden as a normal DB error.
  try {
    await connection();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isOutsideRequestScope =
      /outside a request scope|`connection\(\)`|request scope/i.test(message);
    if (!isOutsideRequestScope) throw error;
  }
  const client = await getClient();
  return client.db(dbName ?? getUriDbName() ?? "bushart");
}
