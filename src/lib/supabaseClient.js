import { createClient } from "@supabase/supabase-js";
import { supabasePublicAnon, supabasePublicUrl } from "./supabaseEnv.js";

const url = supabasePublicUrl(import.meta.env.VITE_SUPABASE_URL);
const key = supabasePublicAnon(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const hasSupabase = Boolean(url && key);
export const supabase = hasSupabase ? createClient(url, key) : null;
