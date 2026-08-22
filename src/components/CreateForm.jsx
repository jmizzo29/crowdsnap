import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { hostUrl } from "../lib/config.js";
import { createGroup } from "../lib/store.js";

export default function CreateForm({ heading = true }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [coverLine, setCoverLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [offGrid, setOffGrid] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    const eventName = name.trim();
    if (!eventName) {
      setError("Give the event a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const group = await createGroup({
        name: eventName,
        date: date.trim(),
        coverLine: coverLine.trim(),
      });
      navigate(`${hostUrl(group.code, "")}${offGrid ? "?camp=1" : ""}`, { replace: true });
    } catch (err) {
      setError(err.message || "Could not make the group.");
      setBusy(false);
    }
  }

  return (
    <form className="stack gap-l" onSubmit={onSubmit}>
      {heading ? (
        <div>
          <h2 className="display display-md">Name the event</h2>
          <p className="lede">One day or several. Same code.</p>
        </div>
      ) : null}

      <label className="field">
        <span>Event</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cal & Mira"
          autoComplete="off"
          maxLength={80}
        />
      </label>

      <label className="field">
        <span>Date</span>
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="21 August or 21–23 August"
          autoComplete="off"
          maxLength={48}
        />
      </label>

      <label className="field">
        <span>On the card</span>
        <input
          value={coverLine}
          onChange={(e) => setCoverLine(e.target.value)}
          placeholder="Sam"
          autoComplete="off"
          maxLength={60}
        />
      </label>

      <label className="camp-toggle">
        <input
          type="checkbox"
          checked={offGrid}
          onChange={(event) => setOffGrid(event.target.checked)}
        />
        We’ll be off the grid
      </label>
      {offGrid ? (
        <p className="fine">Camp starts on the leader phone. Guests join that Wi‑Fi.</p>
      ) : null}

      <div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Minting the code…" : "Get the code"}
        </button>
        {error ? <p className="warn">{error}</p> : <p className="fine">No account. The code is the door.</p>}
      </div>
    </form>
  );
}
