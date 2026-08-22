import { supabase } from "./supabaseClient.js";
import { generateCode, normalizeCode } from "./codes.js";
import { STORAGE_BUCKET } from "./config.js";

function normalizeGroup(row) {
  if (!row) return null;
  const code = normalizeCode(row.slug || row.code || row.id);
  return {
    id: row.id,
    code,
    slug: (row.slug || code).toLowerCase(),
    name: row.name,
    date: row.event_date || row.date || "",
    coverLine: row.cover_line || row.coverLine || "",
    createdAt: row.created_at || row.createdAt,
    source: "supabase",
    localOnly: false,
  };
}

function inferKind(item) {
  if (item.kind) return item.kind;
  if (String(item.type || "").startsWith("video")) return "video";
  return "photo";
}

function flattenMedia(rows) {
  const items = [];
  for (const memory of rows || []) {
    const media = Array.isArray(memory.media) ? memory.media : [];
    for (const item of media) {
      items.push({
        id: item.id || item.path || item.url,
        kind: inferKind(item),
        url: item.url,
        thumbUrl: item.thumbUrl || item.thumb_url || item.url,
        name: item.name,
        type: item.type,
        path: item.path,
        guestName: item.guestName || memory.title || memory.notes || "",
        width: item.width,
        height: item.height,
        createdAt: memory.created_at || item.createdAt,
        memoryId: memory.id,
      });
    }
  }
  return items;
}

export async function supabaseGetGroup(code) {
  if (!supabase) return null;
  const slug = normalizeCode(code).toLowerCase();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeGroup(data);
}

async function insertGroupRow(row) {
  let result = await supabase.from("groups").insert(row).select("*").single();
  if (result.error && /column|schema cache|could not find/i.test(result.error.message || "")) {
    result = await supabase
      .from("groups")
      .insert({ name: row.name, slug: row.slug })
      .select("*")
      .single();
  }
  return result;
}

export async function supabaseCreateGroup({ name, date, coverLine }) {
  if (!supabase) return null;
  for (let i = 0; i < 6; i += 1) {
    const code = generateCode();
    const slug = code.toLowerCase();
    const { data, error } = await insertGroupRow({
      name,
      slug,
      event_date: date || null,
      cover_line: coverLine || null,
    });
    if (!error && data) return normalizeGroup(data);
    if (error && /duplicate|unique/i.test(error.message || "")) continue;
    throw error;
  }
  throw new Error("Could not mint a free code.");
}

export async function supabaseListMedia(groupId) {
  if (!supabase || !groupId) return [];
  const { data, error } = await supabase
    .from("memories")
    .select("id, created_at, title, notes, media")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return flattenMedia(data);
}

export async function supabaseUploadFile(file, path, onProgress) {
  if (!supabase) throw new Error("Shared storage is not configured.");
  if (onProgress) onProgress(0.15);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  if (onProgress) onProgress(0.9);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function supabaseAddMemory({ groupId, guestName, media }) {
  if (!supabase) throw new Error("Shared storage is not configured.");
  const payload = {
    group_id: groupId,
    type: "media",
    day: "Upload",
    title: guestName || (media.length === 1 ? media[0].name : "Group upload"),
    notes: guestName || "",
    media,
  };
  const { data, error } = await supabase.from("memories").insert([payload]).select("*").single();
  if (error) throw error;
  return data;
}
