import { list, put } from "@vercel/blob";
import { hasBlob, json, normalizeCode, readBody, supabaseAdmin } from "../../_lib.js";

export default async function handler(req, res) {
  const code = normalizeCode(req.query.code);
  if (!code) {
    json(res, 400, { error: "Missing code" });
    return;
  }

  try {
    if (req.method === "GET") {
      const items = await readIndex(code);
      json(res, 200, items);
      return;
    }

    if (req.method === "POST") {
      const item = readBody(req);
      if (!item?.id || !item?.url) {
        json(res, 400, { error: "Media item needs id and url." });
        return;
      }
      const saved = await writeItem(code, item);
      json(res, 200, saved);
      return;
    }

    json(res, 405, { error: "GET or POST" });
  } catch (error) {
    json(res, 500, { error: error.message || "Media failed" });
  }
}

function slugOf(code) {
  return normalizeCode(code).toLowerCase();
}

const MEDIA_CAP = 5000;

function entryPrefix(code) {
  return `groups/${slugOf(code)}/entry/`;
}

function clientTime(item) {
  for (const raw of [item?.createdAt, item?.takenAt]) {
    if (!raw) continue;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return "";
}

async function listEntryBlobs(prefix) {
  const blobs = [];
  let cursor;
  for (let pageNum = 0; pageNum < 6; pageNum += 1) {
    const page = await list({
      prefix,
      limit: 1000,
      cursor,
    });
    const batch = page.blobs || [];
    blobs.push(...batch);
    if (!batch.length || !page.cursor || page.cursor === cursor) break;
    if (page.hasMore === false) break;
    cursor = page.cursor;
    if (blobs.length >= MEDIA_CAP) break;
  }
  return blobs.slice(0, MEDIA_CAP);
}

async function readIndex(code) {
  if (hasBlob()) {
    const blobs = await listEntryBlobs(entryPrefix(code));
    const items = [];
    await Promise.all(
      blobs.map(async (blob) => {
        const remote = await fetch(blob.url, { cache: "no-store" });
        if (!remote.ok) return;
        const data = await remote.json();
        if (data?.id && data?.url) items.push(data);
      }),
    );
    items.sort((a, b) => {
      const left = String(b.takenAt || b.createdAt || "");
      const right = String(a.takenAt || a.createdAt || "");
      return left.localeCompare(right);
    });
    return items;
  }

  const supabase = supabaseAdmin();
  if (!supabase) return [];
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", slugOf(code))
    .maybeSingle();
  if (!group) return [];
  const { data } = await supabase
    .from("memories")
    .select("id, created_at, title, notes, media")
    .eq("group_id", group.id)
    .order("created_at", { ascending: false })
    .limit(MEDIA_CAP);
  const items = [];
  for (const memory of data || []) {
    for (const item of memory.media || []) {
      items.push({
        ...item,
        guestName: item.guestName || memory.title || "",
        createdAt: memory.created_at,
        memoryId: memory.id,
        kind: item.kind || (String(item.type || "").startsWith("video") ? "video" : "photo"),
        thumbUrl: item.thumbUrl || item.url,
      });
    }
  }
  return items;
}

async function writeItem(code, item) {
  const created = clientTime({ createdAt: item.createdAt });
  const taken = clientTime({ takenAt: item.takenAt });
  const when = created || taken || new Date().toISOString();
  const saved = {
    ...item,
    createdAt: created || when,
    takenAt: taken || created || when,
  };

  if (hasBlob()) {
    const safeId = String(saved.id).replace(/[^a-zA-Z0-9._-]/g, "_");
    await put(`${entryPrefix(code)}${safeId}.json`, JSON.stringify(saved), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return saved;
  }

  const supabase = supabaseAdmin();
  if (!supabase) throw new Error("Shared storage is not configured.");
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", slugOf(code))
    .maybeSingle();
  if (!group) throw new Error("Group not found");
  await supabase.from("memories").insert([
    {
      group_id: group.id,
      type: "media",
      day: "Upload",
      title: saved.guestName || saved.name || "Upload",
      notes: saved.guestName || "",
      media: [saved],
    },
  ]);
  return saved;
}
