import { Link, useNavigate } from "react-router-dom";
import UploadControls from "../components/UploadControls.jsx";
import { useGuestName } from "../lib/useGuestName.js";
import { useGroupFromRoute } from "../lib/useGroup.js";
import Missing from "./Missing.jsx";

export default function Guest() {
  const { group, status, code } = useGroupFromRoute();
  const [guestName, setGuestName] = useGuestName();
  const navigate = useNavigate();

  if (status === "loading") {
    return (
      <div className="page guest">
        <div className="gel" />
        <div className="quiet">
          <p className="lede">Opening the door…</p>
        </div>
      </div>
    );
  }

  if (!group) return <Missing code={code} />;

  return (
    <div className="page guest">
      <div className="gel" />
      <div className="grain" />
      <div className="topbar">
        <Link className="wordmark" to={`/g/${group.code.toLowerCase()}`}>
          Wall
        </Link>
        <span className="wordmark">{group.date || "Tonight"}</span>
      </div>
      <div className="guest-body">
        <p className="kicker">{group.date || "Tonight"}</p>
        <h1 className="display display-lg">{group.name}</h1>
        <p className="lede">One photo. It hits the wall.</p>

        <label className="field">
          <span>Your name</span>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="June"
            autoComplete="given-name"
          />
        </label>

        <UploadControls
          group={group}
          guestName={guestName}
          onAdded={() => navigate(`/g/${group.code.toLowerCase()}`)}
        >
          {({ busy, takePhoto, fromRoll }) => (
            <div className="stack gap-s" style={{ marginTop: 28 }}>
              <button className="btn" type="button" onClick={takePhoto} disabled={busy}>
                Take a photo
              </button>
              <button className="btn-ghost" type="button" onClick={fromRoll} disabled={busy}>
                From the roll, or a video
              </button>
            </div>
          )}
        </UploadControls>
      </div>
    </div>
  );
}
