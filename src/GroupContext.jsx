import { createContext, useContext } from "react";

const GroupContext = createContext(null);

export function GroupProvider({ group, children }) {
  return (
    <GroupContext.Provider value={group}>{children}</GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
