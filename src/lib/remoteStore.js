import { generateCode, normalizeCode } from "./codes.js";

export async function probeRemote() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  try {
    const res = await fetch("/api/health", {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function remoteCreateGroup({ name, date, coverLine }) {
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, date, coverLine, code: generateCode() }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function remoteGetGroup(code) {
  try {
    const res = await fetch(`/api/g/${encodeURIComponent(normalizeCode(code).toLowerCase())}`, {
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function remoteListMedia(code) {
  try {
    const res = await fetch(`/api/g/${encodeURIComponent(normalizeCode(code).toLowerCase())}/media`, {
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}

export async function remoteUpload(code, file, item, onProgress) {
  const { upload } = await import("@vercel/blob/client");
  const safe = `${item.id}${extOf(file.name)}`;
  const blob = await upload(`groups/${normalizeCode(code).toLowerCase()}/media/${safe}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: (event) => {
      if (!onProgress || !event?.total) return;
      onProgress(Math.max(0.05, event.loaded / event.total));
    },
  });
  return blob.url;
}

export async function remoteAddMedia(code, item) {
  const res = await fetch(`/api/g/${encodeURIComponent(normalizeCode(code).toLowerCase())}/media`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

async function readError(res) {
  try {
    const body = await res.json();
    return body.error || body.reason || res.statusText;
  } catch {
    return res.statusText || "Remote store failed";
  }
}

function extOf(name) {
  const match = String(name || "").match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : "";
}
