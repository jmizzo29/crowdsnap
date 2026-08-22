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

  async function onSubmit(event) {
    event.preventDefault();
    const eventName = name.trim();
    if (!eventName) {
      setError("Give the night a name.");
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
      navigate(hostUrl(group.code, ""), { replace: true });
    } catch (err) {
      setError(err.message || "Could not make the group.");
      setBusy(false);
    }
  }

  return (
    <form className="stack gap-l" onSubmit={onSubmit}>
      {heading ? (
        <div>
          <p className="kicker">Tonight</p>
          <h2 className="display display-md">Put the QR on a table. The room fills the wall.</h2>
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
          placeholder="21 August"
          autoComplete="off"
          maxLength={40}
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

      <div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Minting the code…" : "Get the code"}
        </button>
        {error ? <p className="warn">{error}</p> : <p className="fine">No account. The code is the door.</p>}
      </div>
    </form>
  );
}
