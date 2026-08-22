export function mediaKey(item) {
  return item?.id || item?.url || "";
}

export function mergeMedia(remote = [], local = []) {
  const map = new Map();
  for (const item of remote) {
    const key = mediaKey(item);
    if (!key) continue;
    map.set(key, { ...item, pending: false });
  }
  for (const item of local) {
    const key = mediaKey(item);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }
    map.set(key, {
      ...existing,
      url: existing.url || item.url,
      thumbUrl: existing.thumbUrl || item.thumbUrl || existing.url || item.url,
      pending: Boolean(item.pending && !existing.url),
    });
  }
  return [...map.values()].sort((a, b) => {
    const left = Date.parse(a.createdAt || a.takenAt || "") || 0;
    const right = Date.parse(b.createdAt || b.takenAt || "") || 0;
    return right - left;
  });
}
