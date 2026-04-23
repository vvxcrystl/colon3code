import { createFileRoute } from "@tanstack/react-router";

import { ProfilesSettingsPanel } from "../components/settings/ProfilesSettings";

export const Route = createFileRoute("/settings/profiles")({
  component: ProfilesSettingsPanel,
});
