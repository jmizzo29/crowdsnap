export function shouldShowCampGuestLine({ hubSeen = false, online = true, pending = 0 } = {}) {
  return Boolean(hubSeen || pending > 0 || online === false);
}

export function campGuestCopy(hubSeen) {
  return hubSeen
    ? "The leader phone is collecting shots on this Wi‑Fi."
    : "On this phone until you have signal — or until Camp is on.";
}
