import { useEffect, useState } from "react";
import { isCampHub, setCampHubFlag, startCampHub, stopCampHub } from "../lib/camp.js";

export default function CampHost({ group, startOn = false }) {
  const [on, setOn] = useState(() => startOn || isCampHub(group.code));
  const [status, setStatus] = useState("");
  const [heard, setHeard] = useState(0);

  useEffect(() => {
    if (!on) {
      stopCampHub(group.code);
      setCampHubFlag(group.code, false);
      return undefined;
    }
    setCampHubFlag(group.code, true);
    return startCampHub(group, (state) => {
      setStatus(state.status || "");
      setHeard(state.heard || 0);
    });
  }, [on, group]);

  return (
    <div className="camp-panel">
      <button
        type="button"
        className={on ? "btn" : "btn-line"}
        onClick={() => setOn((current) => !current)}
      >
        {on ? "Camp is on" : "Camp · Nearby"}
      </button>
      {on ? (
        <div className="camp-help">
          <p className="note">
            Open the QR once with signal. Guests join this Wi‑Fi. Shots hop here. Cloud waits for town.
          </p>
          <p className="fine">{status || "Waiting on this Wi‑Fi."}</p>
          {heard > 0 ? <p className="fine">{heard} shot{heard === 1 ? "" : "s"} hopped to this phone.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
