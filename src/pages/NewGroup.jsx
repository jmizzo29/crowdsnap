import { Link } from "react-router-dom";
import CreateForm from "../components/CreateForm.jsx";
import { APP_NAME } from "../lib/config.js";

export default function NewGroup() {
  return (
    <div className="page host">
      <div className="topbar">
        <Link className="wordmark" to="/">
          {APP_NAME}
        </Link>
        <Link className="btn-ghost" to="/">
          Home
        </Link>
      </div>
      <div className="host-main" style={{ alignItems: "stretch", textAlign: "left", maxWidth: 560, margin: "0 auto", width: "100%" }}>
        <p className="kicker">After you pay</p>
        <CreateForm />
      </div>
    </div>
  );
}
