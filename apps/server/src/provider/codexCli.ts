import { expandHomePath } from "../pathExpansion.ts";

export interface CodexCliLaunchOptions {
  readonly profile?: string | undefined;
  readonly oss?: boolean | undefined;
  readonly localProvider?: "" | "lmstudio" | "ollama" | undefined;
}

function cloneProcessEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }
  return env;
}

function trimNonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function buildCodexCliArgs(
  commandArgs: ReadonlyArray<string>,
  options: CodexCliLaunchOptions,
): ReadonlyArray<string> {
  const args: string[] = [];
  const selectedProfile = trimNonEmpty(options.profile);
  if (selectedProfile) {
    args.push("--profile", selectedProfile);
  }
  if (options.oss) {
    args.push("--oss");
  }
  const selectedLocalProvider = trimNonEmpty(options.localProvider);
  if (selectedLocalProvider) {
    args.push("--local-provider", selectedLocalProvider);
  }
  return [...args, ...commandArgs];
}

export function buildCodexCliEnv(homePath: string | undefined): Record<string, string> | undefined {
  const resolvedHomePath = trimNonEmpty(homePath);
  if (!resolvedHomePath) {
    return undefined;
  }

  return {
    ...cloneProcessEnv(),
    CODEX_HOME: expandHomePath(resolvedHomePath),
  };
}
