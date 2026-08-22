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
      const items = await readIndex(code);
      const next = [item, ...items.filter((row) => row.id !== item.id)];
      await writeIndex(code, next);
      json(res, 200, item);
      return;
    }

    json(res, 405, { error: "GET or POST" });
  } catch (error) {
    json(res, 500, { error: error.message || "Media failed" });
  }
}

async function readIndex(code) {
  if (hasBlob()) {
    const { blobs } = await list({ prefix: `groups/${code.toLowerCase()}/index.json`, limit: 1 });
    if (!blobs?.length) return [];
    const remote = await fetch(blobs[0].url);
    if (!remote.ok) return [];
    const data = await remote.json();
    return Array.isArray(data) ? data : [];
  }

  const supabase = supabaseAdmin();
  if (!supabase) return [];
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", code.toLowerCase())
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

async function writeIndex(code, items) {
  if (hasBlob()) {
    await put(`groups/${code.toLowerCase()}/index.json`, JSON.stringify(items), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }

  const supabase = supabaseAdmin();
  if (!supabase) throw new Error("Shared storage is not configured.");
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", code.toLowerCase())
    .maybeSingle();
  if (!group) throw new Error("Group not found");
  await supabase.from("memories").insert([
    {
      group_id: group.id,
      type: "media",
      day: "Upload",
      title: items[0]?.guestName || items[0]?.name || "Upload",
      notes: items[0]?.guestName || "",
      media: [items[0]],
    },
  ]);
}
