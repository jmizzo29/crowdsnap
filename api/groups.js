import { put } from "@vercel/blob";
import { hasBlob, json, normalizeCode, readBody, supabaseAdmin } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }

  const body = readBody(req);
  const name = String(body.name || "").trim();
  if (!name) {
    json(res, 400, { error: "Event name is required." });
    return;
  }

  const date = String(body.date || "").trim();
  const coverLine = String(body.coverLine || "").trim();

  try {
    if (hasBlob()) {
      const group = await createOnBlob({ name, date, coverLine, hint: body.code });
      json(res, 200, group);
      return;
    }

    const supabase = supabaseAdmin();
    if (supabase) {
      const group = await createOnSupabase(supabase, { name, date, coverLine });
      json(res, 200, group);
      return;
    }

    json(res, 501, { error: "Shared storage is not configured." });
  } catch (error) {
    json(res, 500, { error: error.message || "Create failed" });
  }
}

async function createOnBlob({ name, date, coverLine, hint }) {
  const { list } = await import("@vercel/blob");
  for (let i = 0; i < 6; i += 1) {
    const code = normalizeCode(hint && i === 0 ? hint : randomCode());
    const slug = code.toLowerCase();
    const existing = await list({ prefix: `groups/${slug}/meta.json`, limit: 1 });
    if (existing.blobs?.length) continue;
    const group = {
      id: code,
      code,
      slug,
      name,
      date,
      coverLine,
      createdAt: new Date().toISOString(),
      source: "remote",
      localOnly: false,
    };
    await put(`groups/${slug}/meta.json`, JSON.stringify(group), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    await put(`groups/${slug}/index.json`, JSON.stringify([]), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return group;
  }
  throw new Error("Could not mint a free code.");
}

async function createOnSupabase(supabase, { name, date, coverLine }) {
  for (let i = 0; i < 6; i += 1) {
    const code = randomCode();
    const slug = code.toLowerCase();
    let result = await supabase
      .from("groups")
      .insert({ name, slug, event_date: date || null, cover_line: coverLine || null })
      .select("*")
      .single();
    if (result.error && /column|schema cache|could not find/i.test(result.error.message || "")) {
      result = await supabase.from("groups").insert({ name, slug }).select("*").single();
    }
    if (!result.error && result.data) {
      return {
        id: result.data.id,
        code,
        slug,
        name: result.data.name,
        date: result.data.event_date || date || "",
        coverLine: result.data.cover_line || coverLine || "",
        createdAt: result.data.created_at,
        source: "remote",
        localOnly: false,
      };
    }
    if (result.error && /duplicate|unique/i.test(result.error.message || "")) continue;
    throw result.error;
  }
  throw new Error("Could not mint a free code.");
}

function randomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => letters[byte % letters.length]).join("");
}
