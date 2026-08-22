import { formatShortTime, parseItemTime } from "../lib/when.js";

export default function Lightbox({ item, onClose, onPrev, onNext }) {
  if (!item) return null;
  const time = parseItemTime(item);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="lightbox-bar">
        <span>
          {item.guestName || item.name || "On the wall"}
          {time ? <em className="lightbox-time">{formatShortTime(time)}</em> : null}
        </span>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="lightbox-stage" onClick={(event) => event.stopPropagation()}>
        {item.kind === "video" ? (
          <video src={item.url} controls autoPlay playsInline />
        ) : (
          <img src={item.url} alt={item.name || ""} />
        )}
      </div>
      <div className="lightbox-bar">
        <button type="button" className="btn-ghost" onClick={onPrev}>
          Prev
        </button>
        <button type="button" className="btn-ghost" onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}
