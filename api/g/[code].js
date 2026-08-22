import { list, put } from "@vercel/blob";
import { hasBlob, json, normalizeCode, readBody, supabaseAdmin } from "../_lib.js";

export default async function handler(req, res) {
  const code = normalizeCode(req.query.code);
  if (!code) {
    json(res, 400, { error: "Missing code" });
    return;
  }

  try {
    if (req.method === "GET") {
      const group = await readGroup(code);
      if (!group) {
        json(res, 404, { error: "Group not found" });
        return;
      }
      json(res, 200, group);
      return;
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const updated = await updateGroup(code, readBody(req));
      if (!updated) {
        json(res, 404, { error: "Group not found" });
        return;
      }
      json(res, 200, updated);
      return;
    }

    json(res, 405, { error: "GET or PUT" });
  } catch (error) {
    json(res, 500, { error: error.message || "Lookup failed" });
  }
}

async function readGroup(code) {
  if (hasBlob()) {
    const { blobs } = await list({ prefix: `groups/${code.toLowerCase()}/meta.json`, limit: 1 });
    if (!blobs?.length) return null;
    const bust = blobs[0].url.includes("?") ? "&" : "?";
    const remote = await fetch(`${blobs[0].url}${bust}v=${Date.now()}`, { cache: "no-store" });
    if (!remote.ok) return null;
    return remote.json();
  }

  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("slug", code.toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    code,
    slug: data.slug,
    name: data.name || "",
    date: data.event_date || "",
    coverLine: data.cover_line || "",
    createdAt: data.created_at,
    source: "remote",
    localOnly: false,
  };
}

async function updateGroup(code, body) {
  const current = await readGroup(code);
  if (!current) return null;

  const next = {
    ...current,
    name: body.name !== undefined ? String(body.name || "").trim() : current.name || "",
    date: body.date !== undefined ? String(body.date || "").trim() : current.date || "",
    coverLine: body.coverLine !== undefined ? String(body.coverLine || "").trim() : current.coverLine || "",
  };

  if (hasBlob()) {
    await put(`groups/${code.toLowerCase()}/meta.json`, JSON.stringify(next), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    });
    return next;
  }

  const supabase = supabaseAdmin();
  if (!supabase) throw new Error("Shared storage is not configured.");
  await supabase
    .from("groups")
    .update({
      name: next.name,
      event_date: next.date || null,
      cover_line: next.coverLine || null,
    })
    .eq("slug", code.toLowerCase());
  return next;
}
