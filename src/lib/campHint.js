export function shouldShowCampGuestLine({ hubSeen = false, online = true, pending = 0 } = {}) {
  return Boolean(hubSeen || (online === false && pending > 0));
}

export function campGuestCopy(hubSeen) {
  return hubSeen
    ? "The leader phone is collecting shots on this Wi‑Fi."
    : "On this phone until you have signal.";
}
