import { useRef } from "react";
import { swipeAction } from "../lib/swipe.js";
import { formatShortTime, parseItemTime } from "../lib/when.js";

export default function Lightbox({ item, onClose, onPrev, onNext }) {
  const start = useRef(null);
  if (!item) return null;
  const time = parseItemTime(item);

  function stay(event) {
    event.stopPropagation();
  }

  function goPrev(event) {
    stay(event);
    onPrev();
  }

  function goNext(event) {
    stay(event);
    onNext();
  }

  function goClose(event) {
    stay(event);
    onClose();
  }

  function onBackdrop(event) {
    if (event.target === event.currentTarget) onClose();
  }

  function onTouchStart(event) {
    const point = event.changedTouches[0];
    if (!point) return;
    start.current = { x: point.clientX, y: point.clientY };
  }

  function onTouchEnd(event) {
    const origin = start.current;
    start.current = null;
    const point = event.changedTouches[0];
    if (!origin || !point) return;
    const action = swipeAction(point.clientX - origin.x, point.clientY - origin.y);
    if (action === "next") onNext();
    if (action === "prev") onPrev();
    if (action === "close") onClose();
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onBackdrop}>
      <div className="lightbox-bar" onClick={stay}>
        <span>
          {item.guestName || item.name || "On the wall"}
          {time ? <em className="lightbox-time">{formatShortTime(time)}</em> : null}
        </span>
        <button type="button" className="btn-ghost" onClick={goClose}>
          Close
        </button>
      </div>
      <div
        className="lightbox-stage"
        onClick={stay}
        onTouchStart={item.kind === "video" ? undefined : onTouchStart}
        onTouchEnd={item.kind === "video" ? undefined : onTouchEnd}
      >
        {item.kind === "video" ? (
          <video src={item.url} controls autoPlay playsInline />
        ) : (
          <img src={item.url} alt={item.name || ""} draggable="false" />
        )}
      </div>
      <div className="lightbox-bar" onClick={stay}>
        <button type="button" className="btn-ghost" onClick={goPrev}>
          Prev
        </button>
        <button type="button" className="btn-ghost" onClick={goNext}>
          Next
        </button>
      </div>
    </div>
  );
}
