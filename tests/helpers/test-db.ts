import { MongoClient, Db, Collection, Document, ObjectId } from "mongodb";

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
  // Fail before connecting when the URI names a non-test database: the
  // destructive helpers below use deleteMany({}), so pointing them at the
  // application database would wipe real content (see TODO-038 notes).
  // NOTE: multi-host mongodb:// URIs are not parseable by WHATWG URL,
  // so extract the path with a regex instead.
  const uriPath = (uri.match(/^mongodb(?:\+srv)?:\/\/[^/]*\/([^?]*)/) || [])[1] || "";
  const uriDb = uriPath.split("/")[0].trim();
  const allowedTestDbs = new Set(["bushart-test", "bushart-e2e"]);
  if (
    !uriDb ||
    (!allowedTestDbs.has(uriDb) && !uriDb.endsWith("-test"))
  ) {
    throw new Error(
      `Refusing to run tests against non-test database "${uriDb || "(none)"}". ` +
        `Point MONGODB_URI at bushart-test or bushart-e2e.`,
    );
  }
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  const name = db.databaseName;
  if (!allowedTestDbs.has(name) && !name.endsWith("-test")) {
    await client.close();
    client = null;
    db = null;
    throw new Error(
      `Refusing to run tests against non-test database "${name}". ` +
        `Point MONGODB_URI at bushart-test or bushart-e2e.`,
    );
  }
  return db;
}

/**
 * Returns a collection from the test database.
 */
export async function getTestCollection<
  T extends Document = Document,
>(name: string): Promise<Collection<T>> {
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
  const objectId =
    typeof id === "string" ? new ObjectId(id) : id;
  return database.collection(collection).findOne({ _id: objectId });
}

/**
 * Generates a new ObjectId for use in tests.
 */
export function testId(offset = "000000000000000000000001"): ObjectId {
  return new ObjectId(offset);
}

/**
 * Mocks the @/lib/db/mongodb module to return the test database.
 * Call this in beforeAll() of integration tests to redirect all
 * model-layer database calls to the test database.
 *
 * Usage:
 *   vi.mock("@/lib/db/mongodb", () => ({
 *     getDb: () => getTestDb(),
 *     getClient: () => getTestClient(),
 *   }));
 */
export function createMongodbMock() {
  return {
    getDb: async () => await getTestDb(),
    getClient: async () => {
      if (!client) {
        await getTestDb();
      }
      return client;
    },
  };
}
