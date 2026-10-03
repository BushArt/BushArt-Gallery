import { MongoClient } from "mongodb";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/bushart";
const BACKUP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "backups");

async function main() {
  const client = new MongoClient(DB_URI, {
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
