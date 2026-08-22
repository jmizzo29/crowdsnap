import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldShowCampGuestLine } from "./campHint.js";

describe("camp guest line", () => {
  it("stays quiet when online with no hub and no queue", () => {
    assert.equal(shouldShowCampGuestLine({ hubSeen: false, online: true, pending: 0 }), false);
  });

  it("shows when camp is on, the phone is offline, or shots are queued", () => {
    assert.equal(shouldShowCampGuestLine({ hubSeen: true, online: true, pending: 0 }), true);
    assert.equal(shouldShowCampGuestLine({ hubSeen: false, online: false, pending: 0 }), true);
    assert.equal(shouldShowCampGuestLine({ hubSeen: false, online: true, pending: 2 }), true);
  });
});
