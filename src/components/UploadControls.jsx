import { useRef, useState } from "react";
import { applyGel, assertVideoAllowed, compressPhoto, kindFromFile, makeThumb, videoFrameThumb } from "../lib/compress.js";
import { addMedia } from "../lib/store.js";

export default function UploadControls({
  group,
  guestName,
  gel = false,
  onAdded,
  children,
}) {
  const photoRef = useRef(null);
  const libraryRef = useRef(null);
  const [toast, setToast] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    setToast("");
    try {
      for (const raw of files) {
        await uploadOne(raw);
      }
    } catch (error) {
      setToast(error.message || "Upload did not land.");
    } finally {
      setBusy(false);
      setProgress(0);
      if (photoRef.current) photoRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
      window.setTimeout(() => setToast((current) => (current && !current.endsWith("…") ? "" : current)), 3200);
    }
  }

  async function uploadOne(raw) {
    assertVideoAllowed(raw);
    const kind = kindFromFile(raw);
    setToast(kind === "video" ? `Sending ${raw.name}…` : "Compressing…");
    setProgress(0.08);

    let file = raw;
    let width;
    let height;
    let thumbFile;

    if (kind === "photo") {
      if (gel) file = await applyGel(file);
      const compressed = await compressPhoto(file);
      file = compressed.file;
      width = compressed.width;
      height = compressed.height;
      const thumb = await makeThumb(file);
      thumbFile = thumb.file;
      setProgress(0.28);
      setToast("Sending the photo…");
    } else {
      try {
        const thumb = await videoFrameThumb(raw);
        thumbFile = thumb.file;
        width = thumb.width;
        height = thumb.height;
      } catch {
        thumbFile = undefined;
      }
      setToast("Sending the video. This can take a minute on weak wifi.");
    }

    const item = await addMedia(group, file, {
      guestName,
      extra: { width, height, thumbFile },
      onProgress: setProgress,
    });
    setProgress(1);
    setToast(kind === "video" ? "The video is on the wall." : "It hit the wall.");
    onAdded?.(item);
  }

  return (
    <>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {children({
        busy,
        takePhoto: () => photoRef.current?.click(),
        fromRoll: () => libraryRef.current?.click(),
      })}
      {(busy || toast) && (
        <div className="toast" role="status">
          {toast || "Working…"}
          {busy ? (
            <div className="bar">
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
