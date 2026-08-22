import { Link } from "react-router-dom";
import HostLinks from "../components/HostLinks.jsx";
import QRCard from "../components/QRCard.jsx";
import ShareEvent from "../components/ShareEvent.jsx";
import { APP_NAME, groupUrl } from "../lib/config.js";
import { formatCode } from "../lib/codes.js";
import { useGroupFromRoute } from "../lib/useGroup.js";
import Missing from "./Missing.jsx";

export default function Stand() {
  const { group, status, code } = useGroupFromRoute();

  if (status === "loading") {
    return (
      <div className="page stand">
        <div className="quiet">
          <p className="lede">Setting the table…</p>
        </div>
      </div>
    );
  }

  if (!group) return <Missing code={code} />;

  return (
    <div className="page stand">
      <div className="topbar">
        <Link className="wordmark" to="/">
          {APP_NAME}
        </Link>
        {group.date ? <span className="wordmark">{group.date}</span> : <span />}
      </div>
      <div className="stand-main">
        <h1 className="display display-xl">{group.name}</h1>
        <QRCard value={groupUrl(group.code)} label={`${group.name} stand QR`} />
        <p className="secret">{formatCode(group.code)}</p>
        <p className="lede" style={{ marginTop: 22 }}>
          Scan. Take one. It hits the wall.
        </p>
        <ShareEvent group={group} />
        <p className="note">The wall is this machine.</p>
        <HostLinks code={group.code} className="stand-links" />
      </div>
    </div>
  );
}
