import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Lightbox from "../components/Lightbox.jsx";
import UploadControls from "../components/UploadControls.jsx";
import { useGuestName } from "../lib/useGuestName.js";
import { POLL_MS } from "../lib/config.js";
import { formatWallCount } from "../lib/plural.js";
import { isSharedGroup, listMedia } from "../lib/store.js";
import { useGroupFromRoute } from "../lib/useGroup.js";
import Missing from "./Missing.jsx";

export default function Wall() {
  const { group, status, code } = useGroupFromRoute();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(-1);
  const [guestName] = useGuestName();

  useEffect(() => {
    if (!group) return undefined;
    let alive = true;
    const tick = () => {
      listMedia(group).then((rows) => {
        if (alive) setItems(rows);
      });
    };
    const start = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [group]);

  const current = open >= 0 ? items[open] : null;
  const count = useMemo(() => formatWallCount(items), [items]);

  if (status === "loading") {
    return (
      <div className="page wall-page">
        <div className="quiet">
          <p className="lede">Opening the wall…</p>
        </div>
      </div>
    );
  }

  if (!group) return <Missing code={code} />;

  return (
    <div className="page wall-page">
      <header className="wall-head">
        <h1 className="display display-md">{group.name}</h1>
        <span className="live">
          <i /> Live
        </span>
      </header>

      {items.length === 0 ? (
        <div className="wall-empty">
          <p className="kicker">{group.date || "Tonight"}</p>
          <h2 className="display display-md">The wall is waiting.</h2>
          <p className="lede">First photo opens the night. Videos are welcome too.</p>
        </div>
      ) : (
        <div className="masonry">
          {items.map((item, index) => (
            <button
              key={item.id || item.url || index}
              type="button"
              className="tile"
              onClick={() => setOpen(index)}
            >
              {item.kind === "video" && !item.thumbUrl ? (
                <video src={item.url} muted playsInline preload="metadata" />
              ) : (
                <img
                  src={item.thumbUrl || item.url}
                  alt={item.name || ""}
                  loading="lazy"
                />
              )}
              {item.kind === "video" ? <span className="play">Video</span> : null}
            </button>
          ))}
        </div>
      )}

      <UploadControls
        group={group}
        guestName={guestName}
        onAdded={(item) => setItems((prev) => [item, ...prev.filter((row) => row.id !== item.id)])}
      >
        {({ busy, takePhoto, fromRoll }) => (
          <div className="dock">
            <div className="dock-meta">
              <div>{count}</div>
              <div>
                <Link to={`/g/${group.code.toLowerCase()}/add`}>Phone</Link>
                {" · "}
                <Link to={`/g/${group.code.toLowerCase()}/booth`}>Booth</Link>
                {" · "}
                <Link to={`/stand/${group.code.toLowerCase()}`}>Stand</Link>
              </div>
              {!isSharedGroup(group) ? <div>On this device only</div> : null}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-line" type="button" onClick={fromRoll} disabled={busy}>
                Roll
              </button>
              <button className="btn" type="button" onClick={takePhoto} disabled={busy}>
                Add
              </button>
            </div>
          </div>
        )}
      </UploadControls>

      <Lightbox
        item={current}
        onClose={() => setOpen(-1)}
        onPrev={() => setOpen((i) => (i <= 0 ? items.length - 1 : i - 1))}
        onNext={() => setOpen((i) => (i + 1) % items.length)}
      />
    </div>
  );
}
