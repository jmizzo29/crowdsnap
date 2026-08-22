import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { normalizeCode } from "./codes.js";
import { localGetGroup } from "./localStore.js";
import { getGroup } from "./store.js";

export function useGroupFromRoute() {
  const { id } = useParams();
  const code = normalizeCode(id);
  const [state, setState] = useState({ code, group: null, status: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cached = await localGetGroup(code);
        if (alive && cached) setState({ code, group: cached, status: "ready" });
        const found = await getGroup(code);
        if (!alive) return;
        if (found) setState({ code, group: found, status: "ready" });
        else if (!cached) setState({ code, group: null, status: "missing" });
      } catch {
        if (!alive) return;
        setState((current) =>
          current.group ? current : { code, group: null, status: "missing" },
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  const current = state.code === code ? state : { group: null, status: "loading" };
  return { group: current.group, status: current.status, code };
}
