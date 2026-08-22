import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import UploadControls from "../components/UploadControls.jsx";
import { useGuestName } from "../lib/useGuestName.js";
import { applyGel, compressPhoto, makeThumb } from "../lib/compress.js";
import { addMedia } from "../lib/store.js";
import { useGroupFromRoute } from "../lib/useGroup.js";
import Missing from "./Missing.jsx";

export default function Booth() {
  const { group, status, code } = useGroupFromRoute();
  const [mode, setMode] = useState("clear");
  const [preview, setPreview] = useState("");
  const [live, setLive] = useState(false);
  const [help, setHelp] = useState("No camera. This still will do.");
  const [busy, setBusy] = useState(false);
  const [guestName] = useGuestName();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let gone = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (gone) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setLive(true);
        setHelp("");
      } catch {
        setLive(false);
        setHelp("No camera. This still will do.");
      }
    }
    start();
    return () => {
      gone = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function captureLive() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1080;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    let file = new File([blob], "booth.jpg", { type: "image/jpeg" });
    if (mode === "gel") file = await applyGel(file);
    await send(file);
  }

  async function send(file) {
    if (!group) return;
    setBusy(true);
    try {
      const compressed = await compressPhoto(file);
      const thumb = await makeThumb(compressed.file);
      await addMedia(group, compressed.file, {
        guestName,
        extra: { width: compressed.width, height: compressed.height, thumbFile: thumb.file },
      });
      setPreview(URL.createObjectURL(compressed.file));
      setHelp("On the wall.");
    } catch (error) {
      setHelp(error.message || "That frame did not land.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="page booth">
        <div className="quiet">
          <p className="lede">Warming the shutter…</p>
        </div>
      </div>
    );
  }

  if (!group) return <Missing code={code} />;

  return (
    <div className="page booth">
      <div className="booth-head">
        <span>{group.name}</span>
        <Link to={`/g/${group.code.toLowerCase()}`}>Clear</Link>
      </div>
      <div className="booth-rule" />

      <div className={`viewfinder ${mode === "gel" ? "gel-on" : ""}`}>
        {live ? (
          <video ref={videoRef} playsInline muted />
        ) : preview ? (
          <img src={preview} alt="" />
        ) : (
          <img src="/images/still-kitchen.jpg" alt="" />
        )}
      </div>

      <div className="modes">
        <button type="button" className={mode === "clear" ? "on" : ""} onClick={() => setMode("clear")}>
          Clear
        </button>
        <button type="button" className={mode === "gel" ? "on" : ""} onClick={() => setMode("gel")}>
          Gel
        </button>
      </div>

      <div className="shutter-wrap">
        <button
          type="button"
          className="shutter"
          aria-label="Shutter"
          disabled={busy}
          onClick={() => {
            if (live) captureLive();
            else fileRef.current?.click();
          }}
        >
          <span />
        </button>
      </div>
      <p className="booth-help">{busy ? "Sending…" : help}</p>

      <UploadControls group={group} guestName={guestName} gel={mode === "gel"} onAdded={() => setHelp("On the wall.")}>
        {({ fromRoll }) => (
          <div style={{ textAlign: "center", paddingBottom: 28 }}>
            <button className="btn-ghost" type="button" onClick={fromRoll}>
              From the roll
            </button>
          </div>
        )}
      </UploadControls>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          let next = file;
          if (mode === "gel") next = await applyGel(file);
          await send(next);
          event.target.value = "";
        }}
      />
    </div>
  );
}
