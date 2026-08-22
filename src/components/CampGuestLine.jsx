import { useEffect, useState } from "react";
import { campGuestCopy, shouldShowCampGuestLine } from "../lib/campHint.js";
import { isCampHub, startCampGuest, startCampHub } from "../lib/camp.js";

export default function CampGuestLine({ group, pending = 0 }) {
  const [hubSeen, setHubSeen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    function onNet() {
      setOnline(navigator.onLine);
    }
    window.addEventListener("online", onNet);
    window.addEventListener("offline", onNet);
    const stopGuest = startCampGuest(group, (state) => setHubSeen(Boolean(state.hubSeen)));
    const stopHub = isCampHub(group.code) ? startCampHub(group) : () => {};
    return () => {
      window.removeEventListener("online", onNet);
      window.removeEventListener("offline", onNet);
      stopGuest?.();
      stopHub?.();
    };
  }, [group]);

  if (!shouldShowCampGuestLine({ hubSeen, online, pending })) return null;

  return <p className="fine camp-line">{campGuestCopy(hubSeen)}</p>;
}
