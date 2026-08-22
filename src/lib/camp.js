import { normalizeCode } from "./codes.js";
import { localAddMedia, localGetBlob, localHasMedia, localListSendable } from "./localStore.js";

const CHANNEL = (code) => `grouppix-camp:${normalizeCode(code)}`;
const HUB_KEY = (code) => `grouppix-hub:${normalizeCode(code)}`;
const ICE = [{ urls: "stun:stun.l.google.com:19302" }];

const hubs = new Map();
const guests = new Map();

export function isCampHub(code) {
  if (typeof sessionStorage === "undefined") return false;
  const key = HUB_KEY(code);
  return sessionStorage.getItem(key) === "1" || localStorage.getItem(key) === "1";
}

export function setCampHubFlag(code, on) {
  const key = HUB_KEY(code);
  try {
    sessionStorage.setItem(key, on ? "1" : "0");
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function metaOf(item) {
  return {
    id: item.id,
    kind: item.kind || "photo",
    name: item.name,
    type: item.type,
    guestName: item.guestName || "",
    createdAt: item.createdAt,
    width: item.width,
    height: item.height,
    pending: true,
    via: "camp",
  };
}

export function peerId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function openChannel(code) {
  try {
    return new BroadcastChannel(CHANNEL(code));
  } catch {
    return null;
  }
}

function postSignal(code, msg) {
  fetch(`/api/g/${encodeURIComponent(normalizeCode(code).toLowerCase())}/camp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(msg),
  }).catch(() => {});
}

async function pullSignals(code, after) {
  try {
    const res = await fetch(
      `/api/g/${encodeURIComponent(normalizeCode(code).toLowerCase())}/camp?after=${after}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { messages: [], hub: null };
    return await res.json();
  } catch {
    return { messages: [], hub: null };
  }
}

async function ingest(group, item, blob, thumb) {
  if (!group || !item?.id || !blob) return null;
  try {
    if (await localHasMedia(group.code, item.id)) return { already: true };
    const saved = await localAddMedia(group.code, metaOf(item), { blob, thumb });
    window.dispatchEvent(
      new CustomEvent("grouppix-camp-media", { detail: { code: normalizeCode(group.code), item: saved } }),
    );
    return saved;
  } catch (error) {
    console.warn("Camp ingest failed", error);
    return null;
  }
}

function attachDataChannel(channel, group, onPhoto) {
  let expect = null;
  let chunks = [];
  let got = 0;

  channel.binaryType = "arraybuffer";
  channel.onmessage = async (event) => {
    try {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        if (msg.type === "photo-start") {
          expect = msg;
          chunks = [];
          got = 0;
        }
        return;
      }
      if (!expect) return;
      chunks.push(event.data);
      got += event.data.byteLength || 0;
      if (got < expect.size) return;
      const blob = new Blob(chunks, { type: expect.item?.type || "image/jpeg" });
      const item = expect.item;
      expect = null;
      chunks = [];
      const saved = await ingest(group, item, blob, null);
      onPhoto?.(saved);
    } catch (error) {
      console.warn("Camp channel message failed", error);
    }
  };
}

async function sendBlobOnChannel(channel, item, blob) {
  if (!channel || channel.readyState !== "open") return false;
  try {
    channel.send(JSON.stringify({ type: "photo-start", item: metaOf(item), size: blob.size }));
    const buffer = await blob.arrayBuffer();
    const view = new Uint8Array(buffer);
    const step = 16 * 1024;
    for (let i = 0; i < view.length; i += step) {
      channel.send(view.slice(i, i + step).buffer);
    }
    return true;
  } catch (error) {
    console.warn("Camp channel send failed", error);
    return false;
  }
}

export function startCampHub(group, onState) {
  const code = normalizeCode(group?.code);
  if (!code) return () => {};
  if (hubs.has(code)) {
    const current = hubs.get(code);
    if (onState) current.listeners.add(onState);
    onState?.({ ...current.state });
    return () => current.listeners.delete(onState);
  }
  setCampHubFlag(code, true);

  const id = peerId();
  const bus = openChannel(code);
  const peers = new Map();
  const state = { role: "hub", id, heard: 0, status: "Camp is on." };
  const listeners = new Set(onState ? [onState] : []);
  const session = { group, id, bus, peers, state, listeners, timer: 0, poll: 0, lastPull: 0 };

  function say(patch) {
    Object.assign(state, patch);
    for (const fn of listeners) {
      try {
        fn({ ...state });
      } catch {
        /* ignore */
      }
    }
  }

  function hello() {
    const msg = { type: "hub", from: id, code, at: Date.now() };
    try {
      bus?.postMessage(msg);
    } catch {
      /* ignore */
    }
    postSignal(code, { kind: "hub", from: id, at: Date.now() });
  }

  async function onBus(event) {
    const msg = event.data || {};
    try {
      if (msg.type === "photo" && msg.item && msg.blob) {
        const saved = await ingest(group, msg.item, msg.blob, msg.thumb || null);
        if (saved) {
          state.heard += 1;
          say({ status: "Got a shot on this phone." });
        }
        return;
      }
      if (msg.type === "guest" && msg.from) {
        hello();
        connectToGuest(msg.from, msg.offer);
      }
      if (msg.type === "signal" && msg.to === id && msg.payload) {
        applySignal(msg.from, msg.payload);
      }
    } catch (error) {
      console.warn("Camp hub bus failed", error);
    }
  }

  async function connectToGuest(from, offer) {
    if (peers.has(from) || !offer) return;
    try {
      const pc = new RTCPeerConnection({ iceServers: navigator.onLine ? ICE : [] });
      peers.set(from, pc);
      pc.ondatachannel = (event) => attachDataChannel(event.channel, group, () => {
        state.heard += 1;
        say({ status: "Got a shot on this phone." });
      });
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const payload = { ice: event.candidate.toJSON() };
        bus?.postMessage({ type: "signal", from: id, to: from, payload });
        postSignal(code, { kind: "signal", from: id, to: from, payload });
      };
      await pc.setRemoteDescription({ type: "offer", sdp: offer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const payload = { answer: answer.sdp };
      bus?.postMessage({ type: "signal", from: id, to: from, payload });
      postSignal(code, { kind: "signal", from: id, to: from, payload });
    } catch (error) {
      console.warn("Camp hub peer failed", error);
    }
  }

  async function applySignal(from, payload) {
    const pc = peers.get(from);
    if (!pc || !payload?.ice) return;
    try {
      await pc.addIceCandidate(payload.ice);
    } catch {
      /* ignore */
    }
  }

  bus?.addEventListener("message", onBus);
  hello();
  session.timer = window.setInterval(hello, 4000);
  session.poll = window.setInterval(async () => {
    const data = await pullSignals(code, session.lastPull);
    session.lastPull = Date.now();
    for (const row of data.messages || []) {
      if (row.kind === "guest" && row.from && row.payload?.offer) {
        connectToGuest(row.from, row.payload.offer);
      }
      if (row.kind === "signal" && row.to === id && row.payload) {
        applySignal(row.from, row.payload);
      }
    }
  }, 3000);

  hubs.set(code, session);
  say({ status: "Camp is on. Guests on this Wi‑Fi can hop shots here." });
  return () => stopCampHub(code);
}

export function stopCampHub(code) {
  const key = normalizeCode(code);
  const session = hubs.get(key);
  if (!session) return;
  window.clearInterval(session.timer);
  window.clearInterval(session.poll);
  try {
    session.bus?.close();
  } catch {
    /* ignore */
  }
  for (const pc of session.peers.values()) {
    try {
      pc.close();
    } catch {
      /* ignore */
    }
  }
  hubs.delete(key);
}

export function startCampGuest(group, onState) {
  const code = normalizeCode(group?.code);
  if (!code) return () => {};
  stopCampGuest(code);

  const id = peerId();
  const bus = openChannel(code);
  const state = { role: "guest", id, hubSeen: false, status: "" };
  const session = { id, bus, pc: null, channel: null, poll: 0, queue: null, state };
  let lastPull = 0;
  const pending = [];

  function say(patch) {
    Object.assign(state, patch);
    onState?.({ ...state });
  }

  function queue(item, blob, thumb) {
    pending.push({ item, blob, thumb });
    flush();
  }

  async function flush() {
    while (pending.length) {
      const next = pending[0];
      let sent = false;
      try {
        bus?.postMessage({ type: "photo", item: metaOf(next.item), blob: next.blob, thumb: next.thumb || null });
        sent = true;
      } catch {
        /* BC can fail across browsers */
      }
      if (session.channel) sent = (await sendBlobOnChannel(session.channel, next.item, next.blob)) || sent;
      if (!sent && !state.hubSeen) break;
      if (!sent) break;
      pending.shift();
    }
  }

  async function offerToHub(hubId) {
    if (session.pc || typeof RTCPeerConnection !== "function") return;
    try {
      session.pc = new RTCPeerConnection({ iceServers: navigator.onLine ? ICE : [] });
      session.channel = session.pc.createDataChannel("camp");
      session.channel.onopen = () => flush();
      session.pc.onicecandidate = (event) => {
        if (!event.candidate || !hubId) return;
        const payload = { ice: event.candidate.toJSON() };
        bus?.postMessage({ type: "signal", from: id, to: hubId, payload });
        postSignal(code, { kind: "signal", from: id, to: hubId, payload });
      };
      const offer = await session.pc.createOffer();
      await session.pc.setLocalDescription(offer);
      const msg = { type: "guest", from: id, offer: offer.sdp, at: Date.now() };
      bus?.postMessage(msg);
      postSignal(code, { kind: "guest", from: id, payload: { offer: offer.sdp } });
    } catch (error) {
      console.warn("Camp guest offer failed", error);
    }
  }

  async function onBus(event) {
    const msg = event.data || {};
    try {
      if (msg.type === "hub") {
        if (!state.hubSeen) {
          say({ hubSeen: true, status: "Camp is on this Wi‑Fi." });
          offerToHub(msg.from);
          shareAll().catch(() => {});
        }
      }
      if (msg.type === "signal" && msg.to === id && msg.payload?.answer && session.pc) {
        await session.pc.setRemoteDescription({ type: "answer", sdp: msg.payload.answer });
      }
      if (msg.type === "signal" && msg.to === id && msg.payload?.ice && session.pc) {
        await session.pc.addIceCandidate(msg.payload.ice);
      }
    } catch (error) {
      console.warn("Camp guest bus failed", error);
    }
  }

  async function shareAll() {
    const rows = await localListSendable(group.code);
    for (const row of rows) queue(row.item, row.blob, row.thumb);
  }

  bus?.addEventListener("message", onBus);
  try {
    bus?.postMessage({ type: "hello-guest", from: id, code });
  } catch {
    /* ignore */
  }

  const poll = window.setInterval(async () => {
    const data = await pullSignals(code, lastPull);
    lastPull = Date.now();
    if (data.hub && !state.hubSeen) {
      say({ hubSeen: true, status: "Camp is on this Wi‑Fi." });
      offerToHub(data.hub.from || data.hub.id);
      shareAll().catch(() => {});
    }
    for (const row of data.messages || []) {
      if (row.kind === "hub" && !state.hubSeen) {
        say({ hubSeen: true, status: "Camp is on this Wi‑Fi." });
        offerToHub(row.from);
        shareAll().catch(() => {});
      }
      if (row.kind === "signal" && row.to === id && row.payload?.answer && session.pc) {
        try {
          await session.pc.setRemoteDescription({ type: "answer", sdp: row.payload.answer });
        } catch {
          /* ignore */
        }
      }
    }
  }, 3000);

  session.poll = poll;
  session.queue = queue;
  guests.set(code, session);
  return () => stopCampGuest(code);
}

export function stopCampGuest(code) {
  const key = normalizeCode(code);
  const session = guests.get(key);
  if (!session) return;
  window.clearInterval(session.poll);
  try {
    session.bus?.close();
  } catch {
    /* ignore */
  }
  try {
    session.pc?.close();
  } catch {
    /* ignore */
  }
  guests.delete(key);
}

export async function offerCampPhoto(group, item, blob, thumb) {
  if (!group || !item || !blob) return;
  const code = normalizeCode(group.code);
  const session = guests.get(code);
  if (session?.queue) {
    session.queue(item, blob, thumb);
    return;
  }
  try {
    const bus = openChannel(code);
    bus?.postMessage({ type: "photo", item: metaOf(item), blob, thumb: thumb || null });
    bus?.close();
  } catch {
    /* stay local */
  }
}

export async function blobForItem(item) {
  return localGetBlob(item?.blobKey || item?.id);
}
