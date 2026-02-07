import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function sanitizeKey(value) {
  return value.replace(/[^A-Za-z0-9._=\-]/g, "");
}

function loadEnvFile() {
  const envPath = path.resolve(".", "scripts", ".env.copy");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (key.endsWith("SERVICE_KEY")) {
      value = sanitizeKey(value);
    }
    process.env[key] = value;
  }
}

function decodeJwtPayload(jwt) {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  let b = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  if (b.length % 4 === 2) b += "==";
  else if (b.length % 4 === 3) b += "=";
  try {
    const json = Buffer.from(b, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

loadEnvFile();

const required = [
  "PROD_SUPABASE_URL",
  "PROD_SUPABASE_SERVICE_KEY",
  "DEV_SUPABASE_URL",
  "DEV_SUPABASE_SERVICE_KEY",
  "SUPABASE_BUCKET",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

const {
  PROD_SUPABASE_URL,
  PROD_SUPABASE_SERVICE_KEY,
  DEV_SUPABASE_URL,
  DEV_SUPABASE_SERVICE_KEY,
  SUPABASE_BUCKET,
} = process.env;

const limit = Number(process.env.COPY_LIMIT ?? 1000);
const concurrency = Number(process.env.COPY_CONCURRENCY ?? 3);
const logEvery = Number(process.env.COPY_LOG_EVERY ?? 25);

const prodPayload = decodeJwtPayload(PROD_SUPABASE_SERVICE_KEY) ?? {};
const devPayload = decodeJwtPayload(DEV_SUPABASE_SERVICE_KEY) ?? {};
console.log(`Prod key ref=${prodPayload.ref ?? "?"}, role=${prodPayload.role ?? "?"}`);
console.log(`Dev  key ref=${devPayload.ref ?? "?"}, role=${devPayload.role ?? "?"}`);

const prod = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const dev = createClient(DEV_SUPABASE_URL, DEV_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function listAllPaths(bucket, maxItems) {
  const paths = [];
  let offset = 0;
  const pageSize = 1000;
  while (paths.length < maxItems) {
    const { data, error } = await prod.storage.from(bucket).list("", {
      limit: Math.min(pageSize, maxItems - paths.length),
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      if (!item.name) continue;
      if (item.metadata === null && item.id === null) continue;
      paths.push(item.name);
      if (paths.length >= maxItems) break;
    }
    offset += data.length;
  }
  return paths;
}

async function copyOne(path) {
  const { data, error } = await prod.storage
    .from(SUPABASE_BUCKET)
    .download(path);
  if (error) throw error;

  const contentType =
    data?.type || data?.headers?.get?.("content-type") || "application/octet-stream";
  const arrayBuffer = await data.arrayBuffer();

  const { error: upError } = await dev.storage
    .from(SUPABASE_BUCKET)
    .upload(path, arrayBuffer, {
      upsert: true,
      contentType,
    });
  if (upError) throw upError;
}

async function run() {
  console.log(`Listing up to ${limit} files from bucket "${SUPABASE_BUCKET}"...`);
  const paths = await listAllPaths(SUPABASE_BUCKET, limit);
  console.log(`Found ${paths.length} files.`);
  let idx = 0;
  let active = 0;
  let done = 0;
  let failed = 0;
  const started = Date.now();

  await new Promise((resolve) => {
    const next = () => {
      while (active < concurrency && idx < paths.length) {
        const path = paths[idx++];
        active++;
        copyOne(path)
          .then(() => {
            done++;
            if (done % logEvery === 0) {
              const secs = Math.max(1, Math.floor((Date.now() - started) / 1000));
              const rate = (done / secs).toFixed(2);
              console.log(`Progress: ${done}/${paths.length} (${rate} files/s)`);
            }
          })
          .catch((err) => {
            failed++;
            console.error(`Failed: ${path}`, err?.message ?? err);
          })
          .finally(() => {
            active--;
            if (done + failed === paths.length) resolve();
            else next();
          });
      }
    };
    next();
  });

  const secs = Math.max(1, Math.floor((Date.now() - started) / 1000));
  const rate = (done / secs).toFixed(2);
  console.log(`Done. Success: ${done}, Failed: ${failed}. Avg rate: ${rate} files/s`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
