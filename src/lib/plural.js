export function formatWallCount(items) {
  const list = Array.isArray(items) ? items : [];
  const photos = list.filter((item) => item.kind !== "video").length;
  const videos = list.filter((item) => item.kind === "video").length;
  const parts = [];
  if (photos) parts.push(`${photos} ${photos === 1 ? "photo" : "photos"}`);
  if (videos) parts.push(`${videos} ${videos === 1 ? "video" : "videos"}`);
  return parts.length ? parts.join(" · ") : "Empty";
}
