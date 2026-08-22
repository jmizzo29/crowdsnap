import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeMedia } from "./mediaMerge.js";

describe("mergeMedia", () => {
  it("keeps remote photos and adds local pending ones", () => {
    const merged = mergeMedia(
      [
        { id: "a", url: "https://remote/a.jpg", createdAt: "2026-08-22T10:00:00Z" },
        { id: "b", url: "https://remote/b.jpg", createdAt: "2026-08-22T09:00:00Z" },
      ],
      [
        { id: "a", url: "https://remote/a.jpg", pending: false },
        { id: "c", url: "blob:local-c", pending: true, createdAt: "2026-08-22T11:00:00Z" },
      ],
    );
    assert.equal(merged.map((row) => row.id).join(","), "c,a,b");
    assert.equal(merged.find((row) => row.id === "c").pending, true);
    assert.equal(merged.find((row) => row.id === "a").pending, false);
    assert.equal(merged.length, 3);
  });

  it("does not drop a remote wall when local is empty", () => {
    const merged = mergeMedia(
      [{ id: "one" }, { id: "two" }, { id: "three" }, { id: "four" }, { id: "five" }, { id: "six" }],
      [],
    );
    assert.equal(merged.length, 6);
  });
});
