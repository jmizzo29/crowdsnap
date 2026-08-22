import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CampGuestLine from "../components/CampGuestLine.jsx";
import Lightbox from "../components/Lightbox.jsx";
import UploadControls from "../components/UploadControls.jsx";
import { useGuestName } from "../lib/useGuestName.js";
import { APP_NAME, POLL_MS } from "../lib/config.js";
import { formatWallCount } from "../lib/plural.js";
import { isSharedGroup, listMedia } from "../lib/store.js";
import { useGroupFromRoute } from "../lib/useGroup.js";
import { formatShortTime, groupMediaByDay, parseItemTime } from "../lib/when.js";
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
      listMedia(group)
        .then((rows) => {
          if (alive) setItems(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {});
    };
    const start = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, POLL_MS);
    function onCamp(event) {
      if (!alive) return;
      if (event.detail?.code !== group.code) return;
      const item = event.detail.item;
      if (!item) return;
      setItems((prev) => [item, ...prev.filter((row) => row.id !== item.id)]);
    }
    window.addEventListener("grouppix-camp-media", onCamp);
    return () => {
      alive = false;
      window.clearTimeout(start);
      window.clearInterval(timer);
      window.removeEventListener("grouppix-camp-media", onCamp);
    };
  }, [group]);

  const days = useMemo(() => groupMediaByDay(items), [items]);
  const flat = useMemo(() => days.flatMap((day) => day.items), [days]);
  const indexByKey = useMemo(() => {
    const map = new Map();
    flat.forEach((item, index) => {
      map.set(item.id || item.url || index, index);
    });
    return map;
  }, [flat]);
  const current = open >= 0 ? flat[open] : null;
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
        <div className="wall-head-lead">
          <Link className="wordmark" to="/">
            {APP_NAME}
          </Link>
          {group.name ? (
            <h1 className="display display-md">{group.name}</h1>
          ) : group.date ? (
            <h1 className="display display-md">{group.date}</h1>
          ) : null}
        </div>
        <span className="live">
          <i /> Live
        </span>
      </header>
      <CampGuestLine group={group} pending={items.filter((row) => row.pending).length} />

      {flat.length === 0 ? (
        <div className="wall-empty">
          {group.date ? <p className="kicker">{group.date}</p> : null}
          <h2 className="display display-md">The wall is waiting.</h2>
          <p className="lede">First photo opens the wall. Videos are welcome too.</p>
        </div>
      ) : (
        days.map((day) => (
          <section key={day.key} className="day-block">
            <h2 className="day-head">{day.label}</h2>
            <div className="masonry">
              {day.items.map((item, slot) => {
                const key = item.id || item.url || `${day.key}-${slot}`;
                const index = indexByKey.get(item.id || item.url || key) ?? 0;
                const time = parseItemTime(item);
                return (
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
                    {item.pending ? <span className="play tile-pending">Sending</span> : null}
                    {time ? <span className="tile-time">{formatShortTime(time)}</span> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))
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
        onPrev={() =>
          setOpen((i) => {
            if (flat.length < 1) return -1;
            return i <= 0 ? flat.length - 1 : i - 1;
          })
        }
        onNext={() =>
          setOpen((i) => {
            if (flat.length < 1) return -1;
            return (Math.max(i, 0) + 1) % flat.length;
          })
        }
      />
    </div>
  );
}
