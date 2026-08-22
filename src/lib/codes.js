const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateCode(length = 4) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += LETTERS[byte % LETTERS.length];
  }
  return out;
}

export function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function formatCode(value) {
  const code = normalizeCode(value);
  return code.split("").join(" ");
}

export function isValidCode(value) {
  const code = normalizeCode(value);
  return code.length >= 4 && code.length <= 8;
}
