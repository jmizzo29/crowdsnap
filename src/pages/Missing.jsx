import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { normalizeCode } from "../lib/codes.js";

export default function Missing({ code }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  function go(event) {
    event.preventDefault();
    const next = normalizeCode(value);
    if (next.length >= 4) navigate(`/g/${next.toLowerCase()}`);
  }

  return (
    <div className="page">
      <div className="quiet">
        <p className="kicker">Grouppix</p>
        <h1 className="display display-md">That code is not a door.</h1>
        <p className="lede">
          {code ? `${code} is not on this machine, and shared storage did not know it.` : "A group only opens if you have the code."}
        </p>
        <form className="code-entry" onSubmit={go}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="CALM"
            autoCapitalize="characters"
            autoCorrect="off"
          />
          <button className="btn" type="submit">
            Open
          </button>
        </form>
        <p className="note">
          <Link to="/new">Make a group</Link>
        </p>
      </div>
    </div>
  );
}
