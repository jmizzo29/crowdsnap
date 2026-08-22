import { generateCode, normalizeCode } from "./codes.js";

let remoteState = null;

export async function probeRemote() {
  if (remoteState !== null) return remoteState;
  try {
    const res = await fetch("/api/health", { headers: { accept: "application/json" } });
    remoteState = res.ok;
  } catch {
    remoteState = false;
  }
  return remoteState;
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
  const res = await fetch(`/api/g/${encodeURIComponent(normalizeCode(code).toLowerCase())}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function remoteListMedia(code) {
  const res = await fetch(`/api/g/${encodeURIComponent(normalizeCode(code).toLowerCase())}/media`);
  const text = await res.text();
  try {
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
