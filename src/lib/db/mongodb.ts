import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Missing MONGODB_URI environment variable. Set it in .env.local or your runtime environment.",
  );
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable so the client survives hot reloads.
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client and connect.
  const client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

/**
 * Returns a connected MongoClient, reusing a cached instance across hot
 * reloads in development and across module scopes in production.
 */
export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}

/**
 * Returns the application database handle.
 */
export async function getDb() {
  const client = await getClient();
  return client.db();
}