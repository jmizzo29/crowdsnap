import { Link } from "react-router-dom";

export default function HostLinks({ code, className = "host-links" }) {
  const id = code.toLowerCase();
  return (
    <nav className={className}>
      <Link to={`/stand/${id}`}>Open stand</Link>
      <span className="dot">·</span>
      <Link to={`/g/${id}`}>Open the wall</Link>
      <span className="dot">·</span>
      <Link to={`/g/${id}/add`}>Phone</Link>
    </nav>
  );
}
