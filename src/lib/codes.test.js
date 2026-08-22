import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCode, generateCode, isValidCode, normalizeCode } from "./codes.js";
import { formatWallCount } from "./plural.js";
import { formatDayLabel, formatShortTime, groupMediaByDay } from "./when.js";

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

describe("when", () => {
  it("groups newest day first and sorts a day by time", () => {
    const friday = new Date(2026, 7, 21, 19, 10);
    const fridayLater = new Date(2026, 7, 21, 21, 40);
    const saturday = new Date(2026, 7, 22, 10, 5);
    const days = groupMediaByDay([
      { id: "sat", createdAt: saturday.toISOString() },
      { id: "late", takenAt: fridayLater.toISOString() },
      { id: "early", createdAt: friday.toISOString() },
      { id: "none" },
    ]);
    assert.equal(days[0].items.map((row) => row.id).join(","), "sat");
    assert.equal(days[1].items.map((row) => row.id).join(","), "early,late");
    assert.equal(days[2].key, "undated");
    assert.match(formatDayLabel(friday), /Friday/);
    assert.match(formatDayLabel(friday), /21/);
    assert.match(formatDayLabel(friday), /August/);
    assert.match(formatShortTime(friday), /7:10/);
  });
});
