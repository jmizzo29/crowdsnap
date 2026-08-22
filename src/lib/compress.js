import { MAX_VIDEO_BYTES, MAX_VIDEO_MB, PHOTO_MAX_EDGE, PHOTO_QUALITY, THUMB_MAX_EDGE } from "./config.js";

export class MediaError extends Error {
  constructor(message) {
    super(message);
    this.name = "MediaError";
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new MediaError("That photo would not open."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new MediaError("Could not compress that photo."));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

function drawFit(image, maxEdge) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, w, h);
  return { canvas, width: w, height: h };
}

export async function compressPhoto(file, { maxEdge = PHOTO_MAX_EDGE, quality = PHOTO_QUALITY } = {}) {
  const image = await loadImage(file);
  const { canvas, width, height } = drawFit(image, maxEdge);
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  const next = new File([blob], renameJpeg(file.name), { type: "image/jpeg" });
  return { file: next, width, height };
}

export async function makeThumb(file, maxEdge = THUMB_MAX_EDGE) {
  const image = await loadImage(file);
  const { canvas, width, height } = drawFit(image, maxEdge);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.72);
  const next = new File([blob], `thumb-${renameJpeg(file.name)}`, { type: "image/jpeg" });
  return { file: next, width, height };
}

export async function videoFrameThumb(file, maxEdge = THUMB_MAX_EDGE) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve;
      video.onerror = () => reject(new MediaError("That video would not open."));
      video.load();
    });
    video.currentTime = Math.min(0.4, (video.duration || 1) / 4);
    await new Promise((resolve) => {
      video.onseeked = resolve;
      setTimeout(resolve, 600);
    });
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth || 1, video.videoHeight || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((video.videoWidth || 480) * scale));
    canvas.height = Math.max(1, Math.round((video.videoHeight || 480) * scale));
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.72);
    return {
      file: new File([blob], `thumb-${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" }),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function assertVideoAllowed(file) {
  if (!file.type.startsWith("video/")) return;
  if (file.size > MAX_VIDEO_BYTES) {
    throw new MediaError(
      `That video is ${mb(file.size)}. Keep it under ${MAX_VIDEO_MB} MB so the room's wifi can carry it.`,
    );
  }
}

export function kindFromFile(file) {
  if (file.type.startsWith("video/")) return "video";
  return "photo";
}

export function renameJpeg(name) {
  const base = String(name || "photo").replace(/\.[^.]+$/, "");
  return `${base || "photo"}.jpg`;
}

export function mb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function applyGel(file) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  ctx.fillStyle = "rgba(255, 111, 32, 0.28)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.86);
  return new File([blob], renameJpeg(file.name), { type: "image/jpeg" });
}
