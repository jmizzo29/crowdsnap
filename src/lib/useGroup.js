import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { normalizeCode } from "./codes.js";
import { getGroup } from "./store.js";

export function useGroupFromRoute() {
  const { id } = useParams();
  const code = normalizeCode(id);
  const [state, setState] = useState({ code, group: null, status: "loading" });

  useEffect(() => {
    let alive = true;
    getGroup(code)
      .then((found) => {
        if (!alive) return;
        setState({ code, group: found, status: found ? "ready" : "missing" });
      })
      .catch(() => {
        if (!alive) return;
        setState({ code, group: null, status: "missing" });
      });
    return () => {
      alive = false;
    };
  }, [code]);

  const current = state.code === code ? state : { group: null, status: "loading" };
  return { group: current.group, status: current.status, code };
}
