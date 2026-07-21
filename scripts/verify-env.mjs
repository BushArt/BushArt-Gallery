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

  // MongoDB check: first try SRV URI, then fallback to direct host if SRV fails
  let mongoDirect = null;
  try {
    const client = new MongoClient(env.MONGODB_URI, { serverApi: { version: '1', strict: true, deprecationErrors: true } });
    await client.connect();
    await client.db().admin().ping();
    await client.close();
    results.mongo = { ok: true };
  } catch (err) {
    results.mongo = { ok: false, error: err.message, code: err.code, name: err.name };
    // Only attempt SRV direct-connect fallback for mongodb+srv:// URIs.
    // Non-SRV URIs already contain explicit hosts and do not benefit from this fallback.
    if (env.MONGODB_URI.startsWith('mongodb+srv://')) {
      try {
        const afterAt = env.MONGODB_URI.split('@')[1];
        const directUri = `mongodb+srv://${afterAt}`;
        const client2 = new MongoClient(directUri, { serverApi: { version: '1', strict: true, deprecationErrors: true } });
        await client2.connect();
        await client2.db().admin().ping();
        await client2.close();
        mongoDirect = { ok: true, note: 'direct-connect-ok' };
      } catch (err2) {
        mongoDirect = { ok: false, error: err2.message, code: err2.code, name: err2.name };
      }
    }
    results.mongo.direct = mongoDirect;
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
