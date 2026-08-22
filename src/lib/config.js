export const APP_NAME = "Grouppix";

export const PAYMENT_LINK =
  import.meta.env.VITE_PAYMENT_LINK ||
  import.meta.env.PAYMENT_LINK ||
  "https://buy.stripe.com/placeholder";

export const MAX_VIDEO_MB = 80;
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
export const PHOTO_MAX_EDGE = 1600;
export const THUMB_MAX_EDGE = 480;
export const PHOTO_QUALITY = 0.82;
export const POLL_MS = 7000;
export const STORAGE_BUCKET =
  import.meta.env.VITE_SUPABASE_BUCKET || "trip-media";

export function groupUrl(code, origin = globalThis.location?.origin || "") {
  return `${origin}/g/${encodeURIComponent(code.toLowerCase())}`;
}

export function standUrl(code, origin = globalThis.location?.origin || "") {
  return `${origin}/stand/${encodeURIComponent(code.toLowerCase())}`;
}

export function guestUrl(code, origin = globalThis.location?.origin || "") {
  return `${origin}/g/${encodeURIComponent(code.toLowerCase())}/add`;
}

export function boothUrl(code, origin = globalThis.location?.origin || "") {
  return `${origin}/g/${encodeURIComponent(code.toLowerCase())}/booth`;
}

export function hostUrl(code, origin = globalThis.location?.origin || "") {
  return `${origin}/host/${encodeURIComponent(code.toLowerCase())}`;
}
