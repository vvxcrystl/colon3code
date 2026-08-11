import { EnvironmentId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  formatHeaderUsagePercentage,
  getHeaderUsageDisplay,
  shouldShowOpenInPicker,
} from "./ChatHeader";
import { resolveRenameCommit } from "./ChatHeader";

describe("shouldShowOpenInPicker", () => {
  const primaryEnvironmentId = EnvironmentId.make("environment-primary");

  it("shows the picker for projects in the primary environment", () => {
    expect(
      shouldShowOpenInPicker({
        activeProjectName: "codething-mvp",
        activeThreadEnvironmentId: primaryEnvironmentId,
        primaryEnvironmentId,
      }),
    ).toBe(true);
  });

  it("hides the picker when hosted static mode has no primary environment", () => {
    expect(
      shouldShowOpenInPicker({
        activeProjectName: "codething-mvp",
        activeThreadEnvironmentId: EnvironmentId.make("environment-remote"),
        primaryEnvironmentId: null,
      }),
    ).toBe(false);
  });

  it("hides the picker for remote environments", () => {
    expect(
      shouldShowOpenInPicker({
        activeProjectName: "codething-mvp",
        activeThreadEnvironmentId: EnvironmentId.make("environment-remote"),
        primaryEnvironmentId,
      }),
    ).toBe(false);
  });

  it("hides the picker when there is no active project", () => {
    expect(
      shouldShowOpenInPicker({
        activeProjectName: undefined,
        activeThreadEnvironmentId: primaryEnvironmentId,
        primaryEnvironmentId,
      }),
    ).toBe(false);
  });
});

describe("formatHeaderUsagePercentage", () => {
  it("keeps small non-zero usage visible", () => {
    expect(formatHeaderUsagePercentage(0)).toBe("0%");
    expect(formatHeaderUsagePercentage(0.4)).toBe("<1%");
  });

  it("rounds ordinary percentages for the compact header", () => {
    expect(formatHeaderUsagePercentage(31.6)).toBe("32%");
    expect(formatHeaderUsagePercentage(100)).toBe("100%");
  });
});

describe("getHeaderUsageDisplay", () => {
  it("shows remaining usage by default-facing mode", () => {
    expect(getHeaderUsageDisplay(73, true)).toEqual({
      percentage: 27,
      label: "27%",
      qualifier: "left",
    });
  });

  it("can show consumed usage instead", () => {
    expect(getHeaderUsageDisplay(73, false)).toEqual({
      percentage: 73,
      label: "73%",
      qualifier: "used",
    });
  });
});

describe("resolveRenameCommit", () => {
  it("commits a trimmed changed title", () => {
    expect(resolveRenameCommit({ title: "  New title ", originalTitle: "Old" })).toEqual({
      action: "commit",
      title: "New title",
    });
  });

  it("rejects empty and whitespace-only titles", () => {
    expect(resolveRenameCommit({ title: "   ", originalTitle: "Old" })).toEqual({
      action: "reject-empty",
    });
  });

  it("no-ops when the trimmed title is unchanged", () => {
    expect(resolveRenameCommit({ title: " Old ", originalTitle: "Old" })).toEqual({
      action: "noop",
    });
  });
});
