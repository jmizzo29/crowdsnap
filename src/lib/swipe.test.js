import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { swipeAction } from "./swipe.js";

describe("swipe", () => {
  it("treats a left swipe as next and a right swipe as prev", () => {
    assert.equal(swipeAction(-80, 10), "next");
    assert.equal(swipeAction(80, -8), "prev");
  });

  it("treats a downward swipe as close and ignores a tap", () => {
    assert.equal(swipeAction(4, 90), "close");
    assert.equal(swipeAction(8, 6), null);
  });
});
