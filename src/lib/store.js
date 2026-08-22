import { normalizeCode } from "./codes.js";
import { kindFromFile } from "./compress.js";
import { mergeMedia } from "./mediaMerge.js";
import {
  cacheRemoteMedia,
  localAddMedia,
  localCreateGroup,
  localGetBlob,
  localGetGroup,
  localListMedia,
  localListPending,
  localUpdateMedia,
  rememberGroup,
} from "./localStore.js";
import {
  probeRemote,
  remoteAddMedia,
  remoteCreateGroup,
  remoteGetGroup,
  remoteListMedia,
  remoteUpload,
} from "./remoteStore.js";
import { hasSupabase } from "./supabaseClient.js";
import {
  supabaseAddMemory,
  supabaseCreateGroup,
  supabaseGetGroup,
  supabaseListMedia,
  supabaseUploadFile,
} from "./supabaseStore.js";

let flushing = false;
let syncStarted = false;

export function storageMode() {
  if (hasSupabase) return "supabase";
  return "local";
}

export async function createGroup(input) {
  if (hasSupabase) {
    try {
      const group = await supabaseCreateGroup(input);
      if (group) {
        await rememberGroup(group);
        return group;
      }
    } catch (error) {
      console.warn("Supabase create failed", error);
    }
  }

  if (await probeRemote()) {
    try {
      const group = await remoteCreateGroup(input);
      await rememberGroup({ ...group, source: "remote", localOnly: false });
      return { ...group, source: "remote", localOnly: false };
    } catch (error) {
      console.warn("Remote create failed", error);
    }
  }

  return localCreateGroup(input);
}

export async function getGroup(code) {
  const key = normalizeCode(code);
  if (!key) return null;
  const cached = await localGetGroup(key);

  if (hasSupabase) {
    try {
      const group = await supabaseGetGroup(key);
      if (group) {
        await rememberGroup(group);
        return group;
      }
    } catch (error) {
      console.warn("Supabase get failed", error);
    }
  }

  try {
    if (await probeRemote()) {
      const group = await remoteGetGroup(key);
      if (group) {
        const next = { ...group, source: group.source || "remote", localOnly: false };
        await rememberGroup(next);
        return next;
      }
    }
  } catch (error) {
    console.warn("Remote get failed", error);
  }

  if (cached) await rememberGroup(cached);
  return cached || null;
}

export async function listMedia(group) {
  if (!group) return [];
  try {
    const remote = await tryRemoteList(group);
    if (remote.ok) {
      try {
        await cacheRemoteMedia(group.code, remote.items);
      } catch (error) {
        console.warn("Cache remote media failed", error);
      }
    }
    const local = await localListMedia(group.code);
    return mergeMedia(remote.ok ? remote.items : [], local);
  } catch (error) {
    console.warn("List media failed", error);
    try {
      return await localListMedia(group.code);
    } catch {
      return [];
    }
  }
}

export async function addMedia(group, file, { guestName = "", extra = {}, onProgress } = {}) {
  const kind = kindFromFile(file);
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { thumbFile, ...meta } = extra;
  const base = {
    id,
    kind,
    name: file.name,
    type: file.type,
    guestName,
    createdAt: new Date().toISOString(),
    pending: true,
    ...meta,
  };

  if (onProgress) onProgress(0.2);
  const localItem = await localAddMedia(
    group.code,
    { ...base, path: id },
    { blob: file, thumb: thumbFile },
  );
  if (onProgress) onProgress(0.45);

  try {
    const uploaded = await uploadToRemote(group, file, { ...base, pending: false }, { ...meta, thumbFile });
    await localUpdateMedia(group.code, id, {
      pending: false,
      url: uploaded.url,
      thumbUrl: uploaded.thumbUrl || uploaded.url,
      memoryId: uploaded.memoryId,
      path: uploaded.path,
    });
    if (onProgress) onProgress(1);
    return { ...localItem, ...uploaded, pending: false };
  } catch (error) {
    console.warn("Upload queued", error);
    if (onProgress) onProgress(1);
    return { ...localItem, pending: true };
  }
}

export async function flushPendingUploads() {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;
  try {
    const pending = await localListPending();
    for (const { code, item } of pending) {
      try {
        const group = await localGetGroup(code);
        const blob = await localGetBlob(item.blobKey || item.id);
        if (!group || !blob) continue;
        const thumb = item.thumbKey ? await localGetBlob(item.thumbKey) : null;
        const file = asUploadFile(blob, item);
        const uploaded = await uploadToRemote(
          group,
          file,
          { ...item, pending: false },
          { thumbFile: thumb ? asUploadFile(thumb, { name: `${item.id}.jpg`, type: "image/jpeg" }) : undefined },
        );
        await localUpdateMedia(code, item.id, {
          pending: false,
          url: uploaded.url,
          thumbUrl: uploaded.thumbUrl || uploaded.url,
          memoryId: uploaded.memoryId,
          path: uploaded.path,
        });
      } catch (error) {
        console.warn("Pending upload still waiting", error);
      }
    }
  } catch (error) {
    console.warn("Flush failed", error);
  } finally {
    flushing = false;
  }
}

export function startOfflineSync() {
  if (syncStarted || typeof window === "undefined") return;
  syncStarted = true;
  const kick = () => {
    flushPendingUploads().catch(() => {});
  };
  window.addEventListener("online", kick);
  window.setInterval(kick, 20000);
  window.setTimeout(kick, 1200);
}

export function isSharedGroup(group) {
  return Boolean(group && !group.localOnly && group.source !== "local");
}

async function tryRemoteList(group) {
  try {
    if (hasSupabase && group.source === "supabase" && group.id) {
      return { ok: true, items: await supabaseListMedia(group.id) };
    }
    if (group.source === "remote" || (group.source !== "supabase" && group.source !== "local" && !group.localOnly)) {
      if (!(await probeRemote())) return { ok: false, items: [] };
      return { ok: true, items: await remoteListMedia(group.code) };
    }
    if (hasSupabase && group.id && group.source !== "local") {
      return { ok: true, items: await supabaseListMedia(group.id) };
    }
  } catch (error) {
    console.warn("Remote list failed", error);
  }
  return { ok: false, items: [] };
}

async function uploadToRemote(group, file, item, extra = {}) {
  if (hasSupabase && group.source === "supabase" && group.id && !group.localOnly) {
    const path = `${group.slug || group.code.toLowerCase()}/${item.id}-${safeName(file.name)}`;
    const url = await supabaseUploadFile(file, path);
    let thumbUrl = extra.thumbUrl;
    if (extra.thumbFile) {
      thumbUrl = await supabaseUploadFile(
        extra.thumbFile,
        `${group.slug || group.code.toLowerCase()}/thumbs/${item.id}.jpg`,
      );
    }
    const media = [{ ...item, url, thumbUrl: thumbUrl || url, path, pending: false }];
    const memory = await supabaseAddMemory({
      groupId: group.id,
      guestName: item.guestName,
      media,
    });
    return { ...media[0], memoryId: memory.id, createdAt: memory.created_at || item.createdAt };
  }

  const shared = isSharedGroup(group) || group.source === "remote";
  if (shared && (await probeRemote())) {
    const url = await remoteUpload(group.code, file, item);
    let thumbUrl;
    if (extra.thumbFile) {
      thumbUrl = await remoteUpload(group.code, extra.thumbFile, { ...item, id: `${item.id}-thumb` });
    }
    const next = { ...item, url, thumbUrl: thumbUrl || url, path: item.id, pending: false };
    await remoteAddMedia(group.code, next);
    return next;
  }

  throw new Error("No signal. Kept on this phone.");
}

function asUploadFile(blob, item) {
  if (blob instanceof File) return blob;
  return new File([blob], item.name || "photo.jpg", { type: item.type || blob.type || "image/jpeg" });
}

function safeName(name) {
  return String(name || "file").replace(/[^A-Za-z0-9._-]/g, "_").slice(-80);
}
