import { useEffect, useState } from "react";

export default function QRCard({ value, label }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    import("qrcode").then((QR) =>
      QR.toDataURL(value, {
        width: 720,
        margin: 1,
        color: { dark: "#14110e", light: "#f3ead8" },
        errorCorrectionLevel: "M",
      }),
    ).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <figure className="qr-card">
      {src ? <img src={src} alt={label || "Group QR"} /> : <div style={{ aspectRatio: "1" }} />}
    </figure>
  );
}
