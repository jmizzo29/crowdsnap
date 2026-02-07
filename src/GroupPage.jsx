import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./App.css";
import MainTrekApp from "./MainTrekApp.jsx";
import { GroupProvider } from "./GroupContext.jsx";
import { fetchGroupBySlug } from "./lib/groups.js";

export default function GroupPage() {
  const { slug } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const groupSlug = useMemo(() => (slug || "").trim().toLowerCase(), [slug]);

  useEffect(() => {
    let mounted = true;

    async function loadGroup() {
      if (!groupSlug) {
        setError("Missing group slug.");
        setLoading(false);
        return;
      }

      const { data, error: loadError } = await fetchGroupBySlug(groupSlug);

      if (!mounted) return;

      if (loadError || !data) {
        setError(loadError?.message || "Group not found.");
        setGroup(null);
      } else {
        setGroup(data);
        setError("");
      }
      setLoading(false);
    }

    setLoading(true);
    setError("");
    setGroup(null);
    loadGroup();

    return () => {
      mounted = false;
    };
  }, [groupSlug]);

  if (loading) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <div className="card">
            <h2 className="card-title">Loading group...</h2>
            <p className="card-subtitle">Just a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <div className="card">
            <h2 className="card-title">Group not found</h2>
            <p className="card-subtitle">
              We could not load this group. Check the link and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GroupProvider group={group}>
      <MainTrekApp />
    </GroupProvider>
  );
}
