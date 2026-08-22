import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldShowCampGuestLine } from "./campHint.js";

describe("camp guest line", () => {
  it("stays quiet for a rec-room event with bars", () => {
    assert.equal(shouldShowCampGuestLine({ hubSeen: false, online: true, pending: 0 }), false);
    assert.equal(shouldShowCampGuestLine({ hubSeen: false, online: true, pending: 2 }), false);
    assert.equal(shouldShowCampGuestLine({ hubSeen: false, online: false, pending: 0 }), false);
  });

  it("shows only when camp is on, or the phone is offline with a queue", () => {
    assert.equal(shouldShowCampGuestLine({ hubSeen: true, online: true, pending: 0 }), true);
    assert.equal(shouldShowCampGuestLine({ hubSeen: false, online: false, pending: 1 }), true);
  });
});
