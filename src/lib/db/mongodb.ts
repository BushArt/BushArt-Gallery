import { connection } from "next/server";
import { MongoClient, Db, type ClientSession } from "mongodb";
import { runWithTransaction } from "./transaction";

declare global {
  // Cached across hot reloads in development and across module scopes in
  // production. Kept on `globalThis` (not a module-level `let`) precisely so a
  // Next.js dev hot reload — which re-evaluates this module — reuses the same
  // connection pool instead of leaking a new one on every reload.
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

function getOrCreateClient(): Promise<MongoClient> {
  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(getMongoUri(), {
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    });
    globalThis._mongoClientPromise = client.connect().catch(async (error) => {
      globalThis._mongoClientPromise = undefined;
      await client.close().catch(() => undefined);
      throw error;
    });
  }
  return globalThis._mongoClientPromise;
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

export async function startSession(): Promise<ClientSession> {
  const client = await getClient();
  return client.startSession();
}

/**
 * Run `fn` inside a MongoDB transaction when the connected deployment supports
 * them, transparently falling back to a non-transactional run when it does not
 * (see `./transaction.ts`). The callback receives the session — or `undefined`
 * on the fallback path — and MUST pass it to every driver call so the whole
 * unit commits or aborts together.
 */
export async function withTransaction<T>(
  fn: (session: ClientSession | undefined) => Promise<T>,
): Promise<T> {
  return runWithTransaction(startSession, fn);
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
