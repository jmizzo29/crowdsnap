import { list } from "@vercel/blob";
import { hasBlob, json, normalizeCode, supabaseAdmin } from "../_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { error: "GET only" });
    return;
  }

  const code = normalizeCode(req.query.code);
  if (!code) {
    json(res, 400, { error: "Missing code" });
    return;
  }

  try {
    if (hasBlob()) {
      const { blobs } = await list({ prefix: `groups/${code.toLowerCase()}/meta.json`, limit: 1 });
      if (!blobs?.length) {
        json(res, 404, { error: "Group not found" });
        return;
      }
      const remote = await fetch(blobs[0].url);
      if (!remote.ok) {
        json(res, 404, { error: "Group not found" });
        return;
      }
      json(res, 200, await remote.json());
      return;
    }

    const supabase = supabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("slug", code.toLowerCase())
        .maybeSingle();
      if (error || !data) {
        json(res, 404, { error: "Group not found" });
        return;
      }
      json(res, 200, {
        id: data.id,
        code,
        slug: data.slug,
        name: data.name,
        date: data.event_date || "",
        coverLine: data.cover_line || "",
        createdAt: data.created_at,
        source: "remote",
        localOnly: false,
      });
      return;
    }

    json(res, 501, { error: "Shared storage is not configured." });
  } catch (error) {
    json(res, 500, { error: error.message || "Lookup failed" });
  }
}
