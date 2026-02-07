import { supabase } from "../supabaseClient";

export async function fetchGroupBySlug(slug) {
  return supabase
    .from("groups")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();
}
