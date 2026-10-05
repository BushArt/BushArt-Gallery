import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';

function parseEnv(content) {
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

async function main() {
  const env = parseEnv(readFileSync('.env.local', 'utf8'));
  const results = { mongo: null, cloudinary: null };

  // MongoDB check: connect and ping the configured URI
  try {
    const client = new MongoClient(env.MONGODB_URI, { serverApi: { version: '1', strict: true, deprecationErrors: true } });
    await client.connect();
    await client.db().admin().ping();
    await client.close();
    results.mongo = { ok: true };
  } catch (err) {
    results.mongo = { ok: false, error: err.message, code: err.code, name: err.name };
  }

  // Cloudinary check
  try {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    const ping = await cloudinary.api.ping();
    results.cloudinary = { ok: true, status: ping.status ?? 'ok' };
  } catch (err) {
    results.cloudinary = { ok: false, error: err.message, code: err.code, name: err.name };
  }

  console.log(JSON.stringify(results, null, 2));
}

main();
