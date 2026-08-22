import { supabasePublicAnon, supabasePublicUrl } from "../src/lib/supabaseEnv.js";

export default function handler(req, res) {
  const blob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const supabaseAdmin = Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY),
  );
  const supabaseAnon = Boolean(
    supabasePublicUrl(process.env.VITE_SUPABASE_URL) &&
      supabasePublicAnon(process.env.VITE_SUPABASE_ANON_KEY),
  );
  const supabase = supabaseAdmin || supabaseAnon;

  if (!blob && !supabase) {
    res.status(501).json({ ok: false, reason: "no shared storage env" });
    return;
  }

  res.status(200).json({ ok: true, blob, supabase, supabaseAnon, supabaseAdmin });
}
