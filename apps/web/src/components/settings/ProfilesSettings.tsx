import { type ProviderKind, type Profile } from "@t3tools/contracts";
import { CheckIcon, PlusCircleIcon, Trash2Icon } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

import { useSettings, useUpdateSettings } from "../../hooks/useSettings";
import { randomUUID } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SettingsPageContainer, SettingsSection } from "./settingsLayout";

const PROVIDER_KIND_OPTIONS: ReadonlyArray<{ label: string; value: ProviderKind }> = [
  { label: "Codex", value: "codex" },
  { label: "Claude", value: "claudeAgent" },
  { label: "Cursor", value: "cursor" },
  { label: "OpenCode", value: "opencode" },
];

const RUNTIME_MODE_OPTIONS: ReadonlyArray<{ label: string; value: Profile["runtimeMode"] }> = [
  { label: "Full Access", value: "full-access" },
  { label: "Auto-accept Edits", value: "auto-accept-edits" },
  { label: "Approval Required", value: "approval-required" },
];

const INTERACTION_MODE_OPTIONS: ReadonlyArray<{
  label: string;
  value: Profile["interactionMode"];
}> = [
  { label: "Default", value: "default" },
  { label: "Plan", value: "plan" },
];

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">No profiles configured</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground/70">
        Save common provider, model, and permission presets here so switching setups stays fast and
        predictable.
      </p>
    </div>
  );
}

function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    name: profile.name.trim(),
    model: profile.model.trim(),
  };
}

function createDefaultProfile(): Profile {
  return {
    id: randomUUID(),
    name: "New Profile",
    providerKind: "codex",
    model: "gpt-5.4",
    runtimeMode: "full-access",
    interactionMode: "default",
  };
}

function upsertProfile(
  profiles: ReadonlyArray<Profile>,
  profileId: string,
  updates: Partial<Profile>,
): ReadonlyArray<Profile> {
  const existingProfile = profiles.find((profile) => profile.id === profileId);
  const nextProfile = normalizeProfile(
    existingProfile
      ? { ...existingProfile, ...updates, id: profileId }
      : { ...createDefaultProfile(), ...updates, id: profileId },
  );

  return existingProfile
    ? profiles.map((profile) => (profile.id === profileId ? nextProfile : profile))
    : [...profiles, nextProfile];
}

const ProfileCard = memo(function ProfileCard({
  profile,
  onSave,
  onDelete,
}: {
  profile: Profile;
  onSave: (updates: Partial<Profile>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);

  useEffect(() => {
    setDraftProfile(profile);
  }, [profile]);

  const canSave = draftProfile.name.trim().length > 0 && draftProfile.model.trim().length > 0;

  const handleEditOpen = useCallback(() => {
    setDraftProfile(profile);
    setIsEditing(true);
  }, [profile]);

  const handleSave = useCallback(() => {
    if (!canSave) {
      return;
    }
    onSave({
      name: draftProfile.name.trim(),
      providerKind: draftProfile.providerKind,
      model: draftProfile.model.trim(),
      runtimeMode: draftProfile.runtimeMode,
      interactionMode: draftProfile.interactionMode,
      ...(draftProfile.options ? { options: draftProfile.options } : {}),
    });
    setIsEditing(false);
  }, [canSave, draftProfile, onSave]);

  return (
    <div className="border-t border-border/60 px-4 py-5 first:border-t-0 sm:px-5">
      {!isEditing ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{profile.name}</h3>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-6 rounded-sm p-0 text-muted-foreground hover:text-foreground"
                onClick={handleEditOpen}
                title="Edit profile"
              >
                <span className="text-[11px]">E</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-6 rounded-sm p-0 text-muted-foreground hover:text-red-500/80"
                onClick={onDelete}
                title="Delete profile"
              >
                <Trash2Icon className="size-3" />
              </Button>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Model: <span className="font-medium text-foreground/80">{profile.model}</span>
            </span>
            <span>
              Provider:{" "}
              <span className="font-medium text-foreground/80 capitalize">
                {profile.providerKind.replace(/([A-Z])/g, " $1")}
              </span>
            </span>
          </div>
        </>
      ) : (
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2.5">
            <Input
              value={draftProfile.name}
              onChange={(event) =>
                setDraftProfile((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Profile name"
              className="h-8 text-xs"
            />
            <Select
              value={draftProfile.providerKind}
              onValueChange={(value) => {
                if (PROVIDER_KIND_OPTIONS.some((option) => option.value === value)) {
                  const nextProviderKind = value as ProviderKind;
                  setDraftProfile({
                    ...draftProfile,
                    providerKind: nextProviderKind,
                  });
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {PROVIDER_KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Input
              value={draftProfile.model}
              onChange={(event) =>
                setDraftProfile((current) => ({
                  ...current,
                  model: event.target.value,
                }))
              }
              placeholder="Model slug (for example gpt-5.4)"
              className="h-8 text-xs"
            />
            <Select
              value={draftProfile.runtimeMode}
              onValueChange={(value) => {
                if (RUNTIME_MODE_OPTIONS.some((option) => option.value === value)) {
                  const nextRuntimeMode = value as Profile["runtimeMode"];
                  setDraftProfile({
                    ...draftProfile,
                    runtimeMode: nextRuntimeMode,
                  });
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {RUNTIME_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select
              value={draftProfile.interactionMode}
              onValueChange={(value) => {
                if (INTERACTION_MODE_OPTIONS.some((option) => option.value === value)) {
                  const nextInteractionMode = value as Profile["interactionMode"];
                  setDraftProfile({
                    ...draftProfile,
                    interactionMode: nextInteractionMode,
                  });
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {INTERACTION_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon-xs"
              variant="ghost"
              className="size-6 rounded-sm p-0 text-green-600 hover:text-green-700 disabled:text-muted-foreground"
              onClick={handleSave}
              disabled={!canSave}
              title="Save changes"
            >
              <CheckIcon className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export function ProfilesSettingsPanel() {
  const profiles = useSettings((settings) => settings.profiles);
  const { updateSettings } = useUpdateSettings();

  const handleUpdateProfile = useCallback(
    (profileId: string, updates: Partial<Profile>) => {
      updateSettings({
        profiles: upsertProfile(profiles, profileId, updates),
      });
    },
    [profiles, updateSettings],
  );

  const handleDeleteProfile = useCallback(
    (profileId: string) => {
      updateSettings({
        profiles: profiles.filter((profile) => profile.id !== profileId),
      });
    },
    [profiles, updateSettings],
  );

  const handleAddProfile = useCallback(() => {
    const profile = createDefaultProfile();
    updateSettings({
      profiles: [...profiles, profile],
    });
  }, [profiles, updateSettings]);

  return (
    <SettingsPageContainer>
      <SettingsSection title="Profiles">
        <div className="flex flex-col gap-0">
          {profiles.length === 0 ? (
            <EmptyState />
          ) : (
            profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onSave={(updates) => handleUpdateProfile(profile.id, updates)}
                onDelete={() => handleDeleteProfile(profile.id)}
              />
            ))
          )}

          <div className="border-t border-border/60 px-4 py-3 sm:px-5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleAddProfile}
            >
              <PlusCircleIcon className="size-3.5" />
              Add Profile
            </Button>
          </div>
        </div>
      </SettingsSection>
    </SettingsPageContainer>
  );
}
