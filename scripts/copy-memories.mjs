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

loadEnvFile();

const required = [
  "PROD_SUPABASE_URL",
  "PROD_SUPABASE_SERVICE_KEY",
  "DEV_SUPABASE_URL",
  "DEV_SUPABASE_SERVICE_KEY",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

const limit = Number(process.env.MEMORIES_LIMIT ?? 500);

const prod = createClient(process.env.PROD_SUPABASE_URL, process.env.PROD_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const dev = createClient(process.env.DEV_SUPABASE_URL, process.env.DEV_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log(`Fetching latest ${limit} memories from prod...`);
  const { data, error } = await prod
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = data ?? [];
  console.log(`Found ${rows.length} memories.`);

  if (rows.length === 0) return;

  const payload = rows.map(({ id, ...rest }) => rest);

  const { error: upError } = await dev
    .from("memories")
    .insert(payload);

  if (upError) throw upError;
  console.log("Done. Memories copied.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
