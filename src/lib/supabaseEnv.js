// Public crowdsnap_dev anon pair. Safe to ship in the client.
// Do not put a service_role key here. Do not invent a different project.
export const CROWDSNAP_URL = "https://cxvpozabohbieaplsvjw.supabase.co";
export const CROWDSNAP_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dnBvemFib2hiaWVhcGxzdmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MTc3OTQsImV4cCI6MjA4NTk5Mzc5NH0.QkU3wTexuxnHRBP8CgWRDLwsjD2woSm0v5L61BRVAHU";

export function supabasePublicUrl(override) {
  const next = typeof override === "string" ? override.trim() : "";
  return next || CROWDSNAP_URL;
}

export function supabasePublicAnon(override) {
  const next = typeof override === "string" ? override.trim() : "";
  return next || CROWDSNAP_ANON;
}
