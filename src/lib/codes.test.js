import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCode, generateCode, isValidCode, normalizeCode } from "./codes.js";
import { formatWallCount } from "./plural.js";

describe("codes", () => {
  it("normalizes and formats a human code", () => {
    assert.equal(normalizeCode("c a l m"), "CALM");
    assert.equal(formatCode("calm"), "C A L M");
    assert.equal(isValidCode("CALM"), true);
    assert.equal(isValidCode("ab"), false);
  });

  it("generates a 4-letter code without I or O", () => {
    const code = generateCode();
    assert.equal(code.length, 4);
    assert.match(code, /^[A-HJ-NP-Z]{4}$/);
  });
});

describe("plural", () => {
  it("never says 1 photos", () => {
    assert.equal(formatWallCount([]), "Empty");
    assert.equal(formatWallCount([{ kind: "photo" }]), "1 photo");
    assert.equal(
      formatWallCount([{ kind: "photo" }, { kind: "photo" }]),
      "2 photos",
    );
    assert.equal(
      formatWallCount([{ kind: "photo" }, { kind: "video" }]),
      "1 photo · 1 video",
    );
    assert.equal(
      formatWallCount([{ kind: "video" }, { kind: "video" }]),
      "2 videos",
    );
  });
});
