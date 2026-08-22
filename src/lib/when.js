export function parseItemTime(item) {
  const raw = item?.takenAt || item?.createdAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDayLabel(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShortTime(date) {
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}

export function groupMediaByDay(items) {
  const buckets = new Map();
  const undated = [];

  for (const item of items || []) {
    const date = parseItemTime(item);
    if (!date) {
      undated.push(item);
      continue;
    }
    const key = dayKey(date);
    if (!buckets.has(key)) buckets.set(key, { key, date, items: [] });
    buckets.get(key).items.push(item);
  }

  const days = [...buckets.values()].sort((a, b) => b.key.localeCompare(a.key));
  for (const day of days) {
    day.items.sort((a, b) => {
      const left = parseItemTime(a)?.getTime() || 0;
      const right = parseItemTime(b)?.getTime() || 0;
      return left - right;
    });
    day.label = formatDayLabel(day.date);
  }

  if (undated.length) {
    days.push({ key: "undated", label: "Undated", items: undated, date: null });
  }

  return days;
}
