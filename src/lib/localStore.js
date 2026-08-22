import localforage from "localforage";
import { generateCode, normalizeCode } from "./codes.js";

const groupsDb = localforage.createInstance({ name: "grouppix", storeName: "groups" });
const mediaDb = localforage.createInstance({ name: "grouppix", storeName: "media" });
const blobDb = localforage.createInstance({ name: "grouppix", storeName: "blobs" });
const seenDb = localforage.createInstance({ name: "grouppix", storeName: "seen" });

const objectUrls = new Map();

function objectUrlFor(key, blob) {
  const prev = objectUrls.get(key);
  if (prev) URL.revokeObjectURL(prev);
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  return url;
}

export async function localCreateGroup({ name, date, coverLine }) {
  for (let i = 0; i < 8; i += 1) {
    const code = generateCode();
    const existing = await groupsDb.getItem(code);
    if (existing) continue;
    const group = {
      id: code,
      code,
      slug: code.toLowerCase(),
      name,
      date: date || "",
      coverLine: coverLine || "",
      createdAt: new Date().toISOString(),
      source: "local",
      localOnly: true,
    };
    await groupsDb.setItem(code, group);
    await mediaDb.setItem(code, []);
    await rememberGroup(group);
    return group;
  }
  throw new Error("Could not mint a free code.");
}

export async function localGetGroup(code) {
  const key = normalizeCode(code);
  if (!key) return null;
  return (await groupsDb.getItem(key)) || null;
}

export async function localListMedia(code) {
  const key = normalizeCode(code);
  const rows = (await mediaDb.getItem(key)) || [];
  const items = [];
  for (const row of rows) {
    const blob = row.blobKey ? await blobDb.getItem(row.blobKey) : null;
    const thumb = row.thumbKey ? await blobDb.getItem(row.thumbKey) : null;
    items.push({
      ...row,
      url: blob ? objectUrlFor(row.blobKey, blob) : row.url,
      thumbUrl: thumb ? objectUrlFor(row.thumbKey, thumb) : row.thumbUrl || row.url,
      pending: Boolean(row.pending),
    });
  }
  return items;
}

export async function localAddMedia(code, item, { blob, thumb } = {}) {
  const key = normalizeCode(code);
  const rows = (await mediaDb.getItem(key)) || [];
  const blobKey = item.id;
  const thumbKey = thumb ? `${item.id}-thumb` : null;
  if (blob) await blobDb.setItem(blobKey, blob);
  if (thumb) await blobDb.setItem(thumbKey, thumb);
  const next = [
    {
      ...item,
      blobKey,
      thumbKey,
    },
    ...rows,
  ];
  await mediaDb.setItem(key, next);
  return {
    ...item,
    url: blob ? objectUrlFor(blobKey, blob) : item.url,
    thumbUrl: thumb ? objectUrlFor(thumbKey, thumb) : item.thumbUrl || item.url,
  };
}

export async function cacheGroup(group) {
  if (!group?.code) return;
  const key = normalizeCode(group.code);
  const prev = (await groupsDb.getItem(key)) || {};
  await groupsDb.setItem(key, {
    ...prev,
    ...group,
    code: key,
    slug: (group.slug || key).toLowerCase(),
    localOnly: Boolean(group.localOnly),
  });
  const list = (await seenDb.getItem("list")) || [];
  const next = [
    { code: key, name: group.name, date: group.date || "", seenAt: Date.now() },
    ...list.filter((row) => row.code !== key),
  ].slice(0, 12);
  await seenDb.setItem("list", next);
}

export async function rememberGroup(group) {
  await cacheGroup(group);
}

export async function localUpdateMedia(code, id, patch) {
  const key = normalizeCode(code);
  const rows = (await mediaDb.getItem(key)) || [];
  await mediaDb.setItem(
    key,
    rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
  );
}

export async function localGetBlob(blobKey) {
  if (!blobKey) return null;
  return blobDb.getItem(blobKey);
}

export async function localListPending() {
  const out = [];
  await mediaDb.iterate((rows, code) => {
    for (const row of rows || []) {
      if (row.pending) out.push({ code, item: row });
    }
  });
  return out;
}

export async function cacheRemoteMedia(code, remoteItems) {
  const key = normalizeCode(code);
  const existing = (await mediaDb.getItem(key)) || [];
  const byId = new Map(existing.map((row) => [row.id || row.url, row]));
  const next = [];
  const seen = new Set();
  for (const item of remoteItems || []) {
    const id = item.id || item.url;
    if (!id) continue;
    seen.add(id);
    const prev = byId.get(id);
    next.push({
      ...item,
      pending: false,
      blobKey: prev?.blobKey,
      thumbKey: prev?.thumbKey,
    });
  }
  for (const row of existing) {
    const id = row.id || row.url;
    if (row.pending && id && !seen.has(id)) next.unshift(row);
  }
  await mediaDb.setItem(key, next);
}

export async function listSeenGroups() {
  return (await seenDb.getItem("list")) || [];
}
