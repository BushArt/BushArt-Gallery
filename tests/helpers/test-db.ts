import { MongoClient, Db, Collection, ObjectId } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Returns a connection to the test database.
 * Uses MONGODB_URI env var or defaults to localhost bushart-test.
 * Reuses the connection across calls within a test run.
 */
export async function getTestDb(): Promise<Db> {
  if (db) return db;

  const uri =
    process.env.MONGODB_URI ?? "mongodb://localhost:27017/bushart-test";
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

/**
 * Returns a collection from the test database.
 */
export async function getTestCollection<T = Record<string, unknown>>(
  name: string,
): Promise<Collection<T>> {
  const database = await getTestDb();
  return database.collection<T>(name);
}

/**
 * Closes the test database connection.
 * Call in afterAll() to clean up.
 */
export async function closeTestDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

/**
 * Removes all documents from a collection.
 * Use in beforeEach() for test isolation.
 */
export async function clearCollection(name: string): Promise<void> {
  const database = await getTestDb();
  await database.collection(name).deleteMany({});
}

/**
 * Removes all documents from multiple collections.
 */
export async function clearCollections(names: string[]): Promise<void> {
  for (const name of names) {
    await clearCollection(name);
  }
}

/**
 * Inserts test data into a collection.
 */
export async function seedDocument<T>(
  collection: string,
  data: T,
): Promise<void> {
  const database = await getTestDb();
  await database.collection(collection).insertOne(data as Record<string, unknown>);
}

/**
 * Inserts multiple test documents into a collection.
 */
export async function seedDocuments<T>(
  collection: string,
  data: T[],
): Promise<void> {
  const database = await getTestDb();
  await database.collection(collection).insertMany(
    data as Record<string, unknown>[],
  );
}

/**
 * Finds a document by its _id.
 */
export async function findById(
  collection: string,
  id: string | ObjectId,
): Promise<Record<string, unknown> | null> {
  const database = await getTestDb();
  return database.collection(collection).findOne({ _id: id });
}

/**
 * Generates a new ObjectId for use in tests.
 */
export function testId(offset = "000000000000000000000001"): ObjectId {
  return new ObjectId(offset);
}
