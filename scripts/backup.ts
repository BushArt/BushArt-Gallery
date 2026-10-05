import { MongoClient } from "mongodb";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BACKUP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "backups");

/**
 * Require an explicit MONGODB_URI.
 *
 * This used to fall back to `mongodb://localhost:27017/bushart`, which made a
 * misconfigured backup indistinguishable from a good one: the scheduled workflow
 * declared its own empty MongoDB service container, so every Sunday it produced
 * a well-formed JSON artifact containing zero documents. Failing loudly is
 * strictly better than archiving nothing while reporting success.
 *
 * Resolved inside `main()` so the throw is typed as `never` and the URI narrows
 * to `string` for the rest of the function.
 */
function requireDbUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Refusing to fall back to localhost, which would " +
        "silently archive an empty database.",
    );
  }
  return uri;
}

async function main() {
  const client = new MongoClient(requireDbUri(), {
    connectTimeoutMS: 15_000,
    serverSelectionTimeoutMS: 15_000,
  });

  await client.connect();

  const dbName = client.db().databaseName;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `${dbName}-${timestamp}.json`);

  await mkdir(BACKUP_DIR, { recursive: true });

  const collections = ["artworks", "tags", "admins", "site_settings"];
  const backup: Record<string, unknown[]> = {};

  for (const colName of collections) {
    const docs = await client.db(dbName).collection(colName).find({}).toArray();
    backup[colName] = docs.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
    }));
  }

  const fs = await import("node:fs");
  await fs.promises.writeFile(
    backupPath,
    JSON.stringify(backup, null, 2),
    "utf-8",
  );

  await client.close();
  console.log(`Backup written to ${backupPath}`);
}

main().catch((error) => {
  console.error("Backup failed:", error);
  process.exit(1);
});
