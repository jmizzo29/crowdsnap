import { list, put } from "@vercel/blob";
import { hasBlob, json, normalizeCode, readBody } from "../../_lib.js";

const CAP = 80;

export default async function handler(req, res) {
  const code = normalizeCode(req.query.code);
  if (!code) {
    json(res, 400, { error: "Missing code" });
    return;
  }

  try {
    if (req.method === "GET") {
      const state = await readCamp(code);
      const after = Number(req.query.after || 0) || 0;
      json(res, 200, {
        hub: state.hub || null,
        messages: (state.messages || []).filter((row) => Number(row.at || 0) > after),
      });
      return;
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const saved = await writeCamp(code, body);
      json(res, 200, saved);
      return;
    }

    json(res, 405, { error: "GET or POST" });
  } catch (error) {
    console.error("camp signal failed", error);
    json(res, 200, { hub: null, messages: [] });
  }
}

function pathOf(code) {
  return `groups/${normalizeCode(code).toLowerCase()}/camp.json`;
}

async function readCamp(code) {
  if (!hasBlob()) return { hub: null, messages: [] };
  try {
    const { blobs } = await list({ prefix: pathOf(code), limit: 1 });
    if (!blobs?.[0]) return { hub: null, messages: [] };
    const res = await fetch(`${blobs[0].url}?v=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();
    return {
      hub: data.hub || null,
      messages: Array.isArray(data.messages) ? data.messages : [],
    };
  } catch {
    return { hub: null, messages: [] };
  }
}

async function writeCamp(code, body) {
  const state = await readCamp(code);
  const at = Date.now();
  if (body?.kind === "hub") {
    state.hub = { from: body.from, at };
  }
  if (body && body.kind !== "hub") {
    state.messages = [
      ...(state.messages || []),
      {
        id: `${at}-${Math.random().toString(36).slice(2, 6)}`,
        at,
        kind: body.kind || "signal",
        from: body.from,
        to: body.to,
        payload: body.payload || null,
      },
    ].slice(-CAP);
  }
  if (hasBlob()) {
    await put(pathOf(code), JSON.stringify(state), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  }
  return { ok: true, hub: state.hub };
}
