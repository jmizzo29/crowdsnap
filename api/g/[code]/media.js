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

function entryPrefix(code) {
  return `groups/${slugOf(code)}/entry/`;
}

async function readIndex(code) {
  if (hasBlob()) {
    const { blobs } = await list({ prefix: entryPrefix(code), limit: 1000 });
    const items = [];
    await Promise.all(
      (blobs || []).map(async (blob) => {
        const remote = await fetch(blob.url, { cache: "no-store" });
        if (!remote.ok) return;
        const data = await remote.json();
        if (data?.id && data?.url) items.push(data);
      }),
    );
    items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
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
    .limit(200);
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
  const saved = {
    ...item,
    createdAt: item.createdAt || new Date().toISOString(),
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
