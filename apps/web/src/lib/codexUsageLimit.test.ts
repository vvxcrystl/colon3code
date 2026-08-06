import { describe, expect, it } from "vite-plus/test";
import { EventId, type OrchestrationThreadActivity, TurnId } from "@t3tools/contracts";
import { deriveLatestCodexUsageLimitPercent } from "./codexUsageLimit";

function activity(payload: unknown): OrchestrationThreadActivity {
  return {
    id: EventId.make("rate-limit-1"),
    tone: "info",
    kind: "account-rate-limits.updated",
    summary: "Usage limit updated",
    payload,
    turnId: TurnId.make("turn-1"),
    createdAt: "2026-07-23T00:00:00.000Z",
  };
}

describe("deriveLatestCodexUsageLimitPercent", () => {
  it("reads Codex rolling primary usage updates", () => {
    expect(
      deriveLatestCodexUsageLimitPercent([
        activity({ rateLimits: { rateLimits: { primary: { usedPercent: 37 } } } }),
      ]),
    ).toBe(37);
  });

  it("ignores unavailable and malformed limits", () => {
    expect(deriveLatestCodexUsageLimitPercent([activity({ rateLimits: {} })])).toBeNull();
  });
});
