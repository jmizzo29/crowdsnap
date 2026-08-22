import { useState } from "react";
import { groupUrl } from "../lib/config.js";

export default function ShareEvent({ group }) {
  const [note, setNote] = useState("");
  const url = groupUrl(group.code);

  async function share() {
    const payload = {
      title: group.name,
      text: `${group.name}. Scan to add a photo.`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied");
    } catch {
      setNote(url);
    }
  }

  return (
    <div className="share-event">
      <button className="btn" type="button" onClick={share}>
        Share
      </button>
      {note ? <p className="fine">{note}</p> : null}
    </div>
  );
}
