export function swipeAction(dx, dy, { min = 40, close = 60 } = {}) {
  if (Math.abs(dx) < min && Math.abs(dy) < min) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "next" : "prev";
  if (dy > close) return "close";
  return null;
}
