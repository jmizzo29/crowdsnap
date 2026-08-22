import { normalizeCode } from "./codes.js";
import { kindFromFile } from "./compress.js";
import {
  localAddMedia,
  localCreateGroup,
  localGetGroup,
  localListMedia,
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

export function storageMode() {
  if (hasSupabase) return "supabase";
  return "local";
}

export async function createGroup(input) {
  if (await probeRemote()) {
    try {
      const group = await remoteCreateGroup(input);
      await rememberGroup(group);
      return { ...group, source: "remote", localOnly: false };
    } catch (error) {
      console.warn("Remote create failed", error);
    }
  }

  if (hasSupabase) {
    try {
      const group = await supabaseCreateGroup(input);
      if (group) {
        await rememberGroup(group);
        return group;
      }
    } catch (error) {
      console.warn("Supabase create failed, keeping a local group", error);
    }
  }

  return localCreateGroup(input);
}

export async function getGroup(code) {
  const key = normalizeCode(code);
  if (!key) return null;

  if (await probeRemote()) {
    try {
      const group = await remoteGetGroup(key);
      if (group) {
        await rememberGroup(group);
        return { ...group, source: group.source || "remote", localOnly: false };
      }
    } catch (error) {
      console.warn("Remote get failed", error);
    }
  }

  if (hasSupabase) {
    const group = await supabaseGetGroup(key);
    if (group) {
      await rememberGroup(group);
      return group;
    }
  }

  const local = await localGetGroup(key);
  if (local) await rememberGroup(local);
  return local;
}

export async function listMedia(group) {
  if (!group) return [];

  if (group.source === "remote" || (await probeRemote() && !group.localOnly && group.source !== "supabase")) {
    try {
      const items = await remoteListMedia(group.code);
      if (items.length || group.source === "remote") return items;
    } catch (error) {
      console.warn("Remote list failed", error);
    }
  }

  if ((group.source === "supabase" || hasSupabase) && group.id && group.source !== "local") {
    try {
      return await supabaseListMedia(group.id);
    } catch (error) {
      console.warn("Supabase list failed", error);
    }
  }

  return localListMedia(group.code);
}

export async function addMedia(group, file, { guestName = "", extra = {}, onProgress } = {}) {
  const kind = kindFromFile(file);
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const base = {
    id,
    kind,
    name: file.name,
    type: file.type,
    guestName,
    createdAt: new Date().toISOString(),
    ...extra,
  };

  const useRemote = group.source === "remote" || (await probeRemote() && !group.localOnly && group.source !== "supabase" && group.source !== "local");
  if (useRemote) {
    if (onProgress) onProgress(0.05);
    const url = await remoteUpload(group.code, file, base, onProgress);
    let thumbUrl = extra.thumbUrl;
    if (extra.thumbFile) {
      thumbUrl = await remoteUpload(
        group.code,
        extra.thumbFile,
        { ...base, id: `${id}-thumb` },
      );
    }
    const item = { ...base, url, thumbUrl: thumbUrl || url, path: id };
    await remoteAddMedia(group.code, item);
    return item;
  }

  if (hasSupabase && group.id && !group.localOnly) {
    const path = `${group.slug || group.code.toLowerCase()}/${id}-${safeName(file.name)}`;
    const url = await supabaseUploadFile(file, path, onProgress);
    let thumbUrl = extra.thumbUrl;
    if (extra.thumbFile) {
      thumbUrl = await supabaseUploadFile(
        extra.thumbFile,
        `${group.slug || group.code.toLowerCase()}/thumbs/${id}.jpg`,
      );
    }
    const media = [
      {
        ...base,
        url,
        thumbUrl: thumbUrl || url,
        path,
      },
    ];
    const memory = await supabaseAddMemory({
      groupId: group.id,
      guestName,
      media,
    });
    return { ...media[0], memoryId: memory.id, createdAt: memory.created_at };
  }

  if (onProgress) onProgress(0.6);
  const item = await localAddMedia(
    group.code,
    { ...base, path: id },
    { blob: file, thumb: extra.thumbFile },
  );
  if (onProgress) onProgress(1);
  return item;
}

export function isSharedGroup(group) {
  return Boolean(group && !group.localOnly && group.source !== "local");
}

function safeName(name) {
  return String(name || "file").replace(/[^A-Za-z0-9._-]/g, "_").slice(-80);
}
