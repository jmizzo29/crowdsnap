import { useState } from "react";

export function useGuestName(storageKey = "grouppix-name") {
  const [name, setName] = useState(() => sessionStorage.getItem(storageKey) || "");
  function update(value) {
    setName(value);
    sessionStorage.setItem(storageKey, value);
  }
  return [name, update];
}
