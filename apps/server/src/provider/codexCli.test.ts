import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { buildCodexCliArgs, buildCodexCliEnv } from "./codexCli.ts";

describe("buildCodexCliArgs", () => {
  it("prepends the selected profile before the codex subcommand", () => {
    assert.deepStrictEqual(buildCodexCliArgs(["app-server"], { profile: "work" }), [
      "--profile",
      "work",
      "app-server",
    ]);
  });

  it("omits the profile flag when the setting is blank", () => {
    assert.deepStrictEqual(buildCodexCliArgs(["app-server"], { profile: "   " }), ["app-server"]);
  });

  it("adds Codex OSS flags before the subcommand", () => {
    assert.deepStrictEqual(
      buildCodexCliArgs(["app-server"], {
        oss: true,
        localProvider: "ollama",
      }),
      ["--oss", "--local-provider", "ollama", "app-server"],
    );
  });
});

describe("buildCodexCliEnv", () => {
  it("expands CODEX_HOME when configured", () => {
    const env = buildCodexCliEnv("~/.codex-work");
    assert.ok(env);
    assert.notEqual(env.CODEX_HOME, "~/.codex-work");
  });

  it("returns undefined when CODEX_HOME is blank", () => {
    assert.equal(buildCodexCliEnv(" "), undefined);
  });
});
