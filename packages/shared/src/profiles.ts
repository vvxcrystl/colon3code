import type { Profile, ProfileModelOptions } from "@t3tools/contracts/settings";

// ── ID Generation ────────────────────────────────────────────────

export function createProfileId(): string {
  return globalThis.crypto.randomUUID();
}

// ── Profile CRUD Helpers ─────────────────────────────────────────

/** Create a new profile with a generated ID and default runtime/interaction modes. */
export function createProfile(name: string, opts: Omit<Profile, "id" | "name">): Profile {
  return {
    id: createProfileId(),
    name,
    ...opts,
  };
}

/** Update an existing profile by ID. */
export function updateProfile(profile: Profile, updates: Partial<Omit<Profile, "id">>): Profile {
  return { ...profile, ...updates } satisfies Profile;
}

/** Clone a profile with a new name and generated ID. */
export function cloneProfile(profile: Profile, newName: string): Profile {
  const { id, name, ...rest } = profile;
  return createProfile(newName, rest);
}

// ── Model Options Helpers ────────────────────────────────────────

/** Extract the provider kind from a ProfileModelOptions union. */
export function resolveProviderFromOptions(
  opts: ProfileModelOptions | undefined,
): string | undefined {
  if (!opts) return undefined;
  return "provider" in opts ? opts.provider : undefined;
}

// ── Profile List Helpers ─────────────────────────────────────────

/** Find a profile by ID. */
export function findProfileById(profiles: Profile[], id: string): Profile | undefined {
  return profiles.find((p) => p.id === id);
}

/** Get all unique provider kinds used across profiles. */
export function getUniqueProviderKinds(profiles: Profile[]): string[] {
  const seen = new Set<string>();
  for (const p of profiles) {
    if (!seen.has(p.providerKind)) seen.add(p.providerKind);
  }
  return [...seen];
}

/** Group profiles by provider kind. */
export function groupProfilesByProvider(profiles: Profile[]): Record<string, Profile[]> {
  const groups: Record<string, Profile[]> = {};
  for (const p of profiles) {
    const key = p.providerKind;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  }
  return groups;
}

/** Remove a profile by ID from a list. */
export function removeProfile(profiles: Profile[], id: string): Profile[] {
  return profiles.filter((p) => p.id !== id);
}

/** Add or update a profile in a list (upsert). */
export function upsertProfile(profiles: Profile[], profile: Profile): Profile[] {
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    return [...profiles.slice(0, idx), profile, ...profiles.slice(idx + 1)];
  }
  return [...profiles, profile];
}

/** Replace all profiles. */
export function setProfiles(profiles: Profile[]): Profile[] {
  return [...profiles];
}
