import { list, put } from "@vercel/blob";
import { hasBlob, json, normalizeCode, readBody, supabaseAdmin } from "../../_lib.js";

export const config = { maxDuration: 30 };

const MEDIA_CAP = 5000;

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

function catalogPath(code) {
  return `groups/${slugOf(code)}/catalog.json`;
}

function legacyIndexPath(code) {
  return `groups/${slugOf(code)}/index.json`;
}

function clientTime(item) {
  for (const raw of [item?.createdAt, item?.takenAt]) {
    if (!raw) continue;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return "";
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const left = String(b.takenAt || b.createdAt || "");
    const right = String(a.takenAt || a.createdAt || "");
    return left.localeCompare(right);
  });
}

function upsertItem(list, item) {
  const next = Array.isArray(list) ? list.filter((row) => row?.id && row.id !== item.id) : [];
  next.push(item);
  if (next.length <= MEDIA_CAP) return next;
  return sortItems(next).slice(0, MEDIA_CAP);
}

async function listBlobs(prefix, pageLimit = 1000) {
  const blobs = [];
  let cursor;
  for (let pageNum = 0; pageNum < 8; pageNum += 1) {
    const page = await list({
      prefix,
      limit: pageLimit,
      cursor,
    });
    blobs.push(...(page.blobs || []));
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
    if (blobs.length >= MEDIA_CAP) break;
  }
  return blobs.slice(0, MEDIA_CAP);
}

async function readJsonAt(pathname) {
  const blobs = await listBlobs(pathname, 5);
  const blob = blobs.find((row) => row.pathname === pathname) || blobs[0];
  if (!blob) return null;
  const bust = blob.url.includes("?") ? "&" : "?";
  const remote = await fetch(`${blob.url}${bust}v=${Date.now()}`, { cache: "no-store" });
  if (!remote.ok) return null;
  const data = await remote.json();
  if (!Array.isArray(data)) return null;
  return data.filter((row) => row?.id && row?.url);
}

async function writeCatalog(code, items) {
  const body = JSON.stringify(sortItems(items).slice(0, MEDIA_CAP));
  const options = {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  };
  await put(catalogPath(code), body, options);
  await put(legacyIndexPath(code), body, options);
}

async function rebuildFromEntries(code) {
  const blobs = await listBlobs(entryPrefix(code));
  const items = [];
  const batchSize = 10;
  for (let i = 0; i < blobs.length && items.length < MEDIA_CAP; i += batchSize) {
    const chunk = blobs.slice(i, i + batchSize);
    const rows = await Promise.all(
      chunk.map(async (blob) => {
        try {
          const remote = await fetch(blob.url, { cache: "no-store" });
          if (!remote.ok) return null;
          const data = await remote.json();
          return data?.id && data?.url ? data : null;
        } catch {
          return null;
        }
      }),
    );
    items.push(...rows.filter(Boolean));
  }
  return items;
}

async function loadCatalog(code) {
  const catalog = await readJsonAt(catalogPath(code));
  const legacy = await readJsonAt(legacyIndexPath(code));
  const left = catalog || [];
  const right = legacy || [];
  return left.length >= right.length ? left : right;
}

async function readIndex(code) {
  if (hasBlob()) {
    try {
      const catalog = await loadCatalog(code);
      if (catalog.length > 1) return sortItems(catalog);
      const rebuilt = await rebuildFromEntries(code);
      if (rebuilt.length > catalog.length) {
        try {
          await writeCatalog(code, rebuilt);
        } catch {
          /* still return what we have */
        }
        return sortItems(rebuilt);
      }
      return sortItems(catalog.length ? catalog : rebuilt);
    } catch (error) {
      console.error("media list failed", error);
      return [];
    }
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

    let catalog = await loadCatalog(code);
    if (catalog.length <= 1) {
      const rebuilt = await rebuildFromEntries(code);
      if (rebuilt.length > catalog.length) catalog = rebuilt;
    }
    catalog = upsertItem(catalog, saved);
    const listed = catalog.length <= 1 ? await listBlobs(entryPrefix(code)) : [];
    if (catalog.length <= 1 && listed.length > 1) {
      return saved;
    }
    await writeCatalog(code, catalog);
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
