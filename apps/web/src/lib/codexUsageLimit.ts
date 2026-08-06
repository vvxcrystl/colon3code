import type { OrchestrationThreadActivity } from "@t3tools/contracts";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readPrimaryUsedPercent(payload: unknown): number | null {
  const outer = asRecord(payload);
  const rateLimits = asRecord(outer?.rateLimits);
  const snapshot = asRecord(rateLimits?.rateLimits) ?? rateLimits;
  const primary = asRecord(snapshot?.primary);
  const value = primary?.usedPercent;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : null;
}

export function deriveLatestCodexUsageLimitPercent(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
): number | null {
  for (let index = activities.length - 1; index >= 0; index -= 1) {
    const activity = activities[index];
    if (!activity || activity.kind !== "account-rate-limits.updated") {
      continue;
    }
    const usedPercent = readPrimaryUsedPercent(activity.payload);
    if (usedPercent !== null) {
      return usedPercent;
    }
  }
  return null;
}
