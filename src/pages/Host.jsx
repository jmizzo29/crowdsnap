import { Link } from "react-router-dom";
import HostLinks from "../components/HostLinks.jsx";
import QRCard from "../components/QRCard.jsx";
import { APP_NAME, groupUrl } from "../lib/config.js";
import { formatCode } from "../lib/codes.js";
import { isSharedGroup } from "../lib/store.js";
import { useGroupFromRoute } from "../lib/useGroup.js";
import Missing from "./Missing.jsx";

export default function Host() {
  const { group, status, code } = useGroupFromRoute();

  if (status === "loading") return <Shell>Opening the card…</Shell>;
  if (!group) return <Missing code={code} />;

  const url = groupUrl(group.code);

  return (
    <div className="page host">
      <div className="topbar">
        <Link className="wordmark" to="/">
          {APP_NAME}
        </Link>
        <span className="wordmark">{group.date || "Tonight"}</span>
      </div>
      <div className="host-main">
        <p className="kicker">{group.coverLine || "The door"}</p>
        <h1 className="display display-lg">{group.name}</h1>
        <QRCard value={url} label={`${group.name} QR`} />
        <p className="secret">{formatCode(group.code)}</p>
        <p className="note">Scan. Take one. It hits the wall.</p>
        <HostLinks code={group.code} />
        {!isSharedGroup(group) ? (
          <p className="warn">
            This group is on this device right now. Add Supabase or a Vercel Blob token so a second phone with the same code can see the same wall.
          </p>
        ) : (
          <p className="note">Anyone with this code can open the wall and add to it.</p>
        )}
      </div>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="page host">
      <div className="quiet">
        <p className="kicker">{APP_NAME}</p>
        <p className="lede">{children}</p>
      </div>
    </div>
  );
}
