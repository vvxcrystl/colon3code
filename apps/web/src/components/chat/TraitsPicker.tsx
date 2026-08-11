import {
  type ProviderDriverKind,
  type ProviderInstanceId,
  type ProviderOptionDescriptor,
  type ProviderOptionSelection,
  type ScopedThreadRef,
  type ServerProviderModel,
} from "@t3tools/contracts";
import {
  applyClaudePromptEffortPrefix,
  buildProviderOptionSelectionsFromDescriptors,
  getProviderOptionCurrentLabel,
  getProviderOptionCurrentValue,
  getProviderOptionDescriptors,
  isClaudeUltrathinkPrompt,
} from "@t3tools/shared/model";
import { memo, useCallback, useRef, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import { ChevronRightIcon, ZapIcon } from "lucide-react";
import { buttonVariants } from "../ui/button";
import {
  Menu,
  MenuGroup,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator as MenuDivider,
  MenuTrigger,
} from "../ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { useComposerDraftStore, DraftId } from "../../composerDraftStore";
import { getProviderModelCapabilities } from "../../providerModels";
import { cn } from "~/lib/utils";
import { Badge } from "../ui/badge";
import { ComposerControl, ComposerControlChevron, ComposerControlIcon } from "./ComposerControl";

type ProviderOptions = ReadonlyArray<ProviderOptionSelection>;

type TraitsPersistence =
  | {
      threadRef?: ScopedThreadRef;
      draftId?: DraftId;
      onModelOptionsChange?: never;
    }
  | {
      threadRef?: undefined;
      onModelOptionsChange: (nextOptions: ProviderOptions | undefined) => void;
    };

const ULTRATHINK_PROMPT_PREFIX = "Ultrathink:\n";

function DefaultBadge() {
  return (
    <Badge
      variant="outline"
      className="inline-flex h-4 w-fit min-w-0 items-center justify-center gap-0 border-border/70 bg-muted/60 px-1.5 py-0 font-semibold text-[10px] text-muted-foreground leading-none sm:h-4"
    >
      Default
    </Badge>
  );
}

function replaceDescriptorCurrentValue(
  descriptors: ReadonlyArray<ProviderOptionDescriptor>,
  descriptorId: string,
  currentValue: string | boolean | undefined,
): ReadonlyArray<ProviderOptionDescriptor> {
  return descriptors.map((descriptor) =>
    descriptor.id !== descriptorId
      ? descriptor
      : descriptor.type === "boolean"
        ? {
            ...descriptor,
            ...(typeof currentValue === "boolean" ? { currentValue } : {}),
          }
        : {
            ...descriptor,
            ...(typeof currentValue === "string" ? { currentValue } : {}),
          },
  );
}

function getDescriptorStringValue(
  descriptor: Extract<ProviderOptionDescriptor, { type: "select" }> | null,
): string | null {
  if (!descriptor) {
    return null;
  }
  const value = getProviderOptionCurrentValue(descriptor);
  return typeof value === "string" ? value : null;
}

function getSelectedTraits(
  provider: ProviderDriverKind,
  models: ReadonlyArray<ServerProviderModel>,
  model: string | null | undefined,
  prompt: string,
  modelOptions: ProviderOptions | null | undefined,
  allowPromptInjectedEffort: boolean,
) {
  const caps = getProviderModelCapabilities(models, model, provider);
  const descriptors = getProviderOptionDescriptors({
    caps,
    selections: modelOptions,
  });
  const selectDescriptors = descriptors.filter(
    (descriptor): descriptor is Extract<ProviderOptionDescriptor, { type: "select" }> =>
      descriptor.type === "select",
  );
  const booleanDescriptors = descriptors.filter(
    (descriptor): descriptor is Extract<ProviderOptionDescriptor, { type: "boolean" }> =>
      descriptor.type === "boolean",
  );
  const primarySelectDescriptor = selectDescriptors[0] ?? null;
  const contextWindowDescriptor =
    selectDescriptors.find((descriptor) => descriptor.id === "contextWindow") ?? null;
  const agentDescriptor = selectDescriptors.find((descriptor) => descriptor.id === "agent") ?? null;
  const fastModeDescriptor =
    booleanDescriptors.find((descriptor) => descriptor.id === "fastMode") ?? null;
  const thinkingDescriptor =
    booleanDescriptors.find((descriptor) => descriptor.id === "thinking") ?? null;

  // Prompt-controlled effort (e.g. ultrathink in prompt text)
  const ultrathinkPromptControlled =
    allowPromptInjectedEffort &&
    (primarySelectDescriptor?.promptInjectedValues?.length ?? 0) > 0 &&
    isClaudeUltrathinkPrompt(prompt);

  // Check if "ultrathink" appears in the body text (not just our prefix)
  const ultrathinkInBodyText =
    ultrathinkPromptControlled && isClaudeUltrathinkPrompt(prompt.replace(/^Ultrathink:\s*/i, ""));
  const effort =
    (ultrathinkPromptControlled
      ? "ultrathink"
      : getDescriptorStringValue(primarySelectDescriptor)) ?? null;
  const thinkingEnabled =
    typeof thinkingDescriptor?.currentValue === "boolean" ? thinkingDescriptor.currentValue : null;
  const contextWindow = getDescriptorStringValue(contextWindowDescriptor);
  const selectedAgent = getDescriptorStringValue(agentDescriptor);
  const selectedAgentLabel = agentDescriptor
    ? getProviderOptionCurrentLabel(agentDescriptor)
    : null;

  return {
    caps,
    descriptors,
    selectDescriptors,
    booleanDescriptors,
    primarySelectDescriptor,
    contextWindowDescriptor,
    agentDescriptor,
    fastModeDescriptor,
    thinkingDescriptor,
    effort,
    thinkingEnabled,
    contextWindow,
    ultrathinkPromptControlled,
    ultrathinkInBodyText,
    selectedAgent,
    selectedAgentLabel,
  };
}

function getTraitsSectionVisibility(input: {
  provider: ProviderDriverKind;
  models: ReadonlyArray<ServerProviderModel>;
  model: string | null | undefined;
  prompt: string;
  modelOptions: ProviderOptions | null | undefined;
  allowPromptInjectedEffort?: boolean;
}) {
  const selected = getSelectedTraits(
    input.provider,
    input.models,
    input.model,
    input.prompt,
    input.modelOptions,
    input.allowPromptInjectedEffort ?? true,
  );

  const showEffort = selected.primarySelectDescriptor !== null;
  const showThinking = selected.thinkingDescriptor !== null;
  const showFastMode = selected.fastModeDescriptor !== null;
  const showContextWindow = selected.contextWindowDescriptor !== null;
  const showAgent = selected.agentDescriptor !== null;

  return {
    ...selected,
    showEffort,
    showThinking,
    showFastMode,
    showContextWindow,
    showAgent,
    hasAnyControls: showEffort || showThinking || showFastMode || showContextWindow || showAgent,
  };
}

export function shouldRenderTraitsControls(input: {
  provider: ProviderDriverKind;
  models: ReadonlyArray<ServerProviderModel>;
  model: string | null | undefined;
  prompt: string;
  modelOptions: ProviderOptions | null | undefined;
  allowPromptInjectedEffort?: boolean;
}): boolean {
  return getTraitsSectionVisibility(input).hasAnyControls;
}

export interface TraitsMenuContentProps {
  provider: ProviderDriverKind;
  instanceId?: ProviderInstanceId;
  models: ReadonlyArray<ServerProviderModel>;
  model: string | null | undefined;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  modelOptions?: ProviderOptions | null | undefined;
  allowPromptInjectedEffort?: boolean;
  useReasoningSelector?: boolean;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerClassName?: string;
}

export const TraitsMenuContent = memo(function TraitsMenuContentImpl({
  provider,
  instanceId,
  models,
  model,
  prompt,
  onPromptChange,
  modelOptions,
  allowPromptInjectedEffort = true,
  ...persistence
}: TraitsMenuContentProps & TraitsPersistence) {
  const setProviderModelOptions = useComposerDraftStore((store) => store.setProviderModelOptions);
  const updateModelOptions = useCallback(
    (nextOptions: ProviderOptions | undefined) => {
      if ("onModelOptionsChange" in persistence) {
        persistence.onModelOptionsChange(nextOptions);
        return;
      }
      const threadTarget = persistence.threadRef ?? persistence.draftId;
      if (!threadTarget) {
        return;
      }
      setProviderModelOptions(threadTarget, provider, nextOptions, {
        ...(instanceId ? { instanceId } : {}),
        model,
        persistSticky: true,
      });
    },
    [instanceId, model, persistence, provider, setProviderModelOptions],
  );
  const {
    descriptors,
    selectDescriptors,
    booleanDescriptors,
    primarySelectDescriptor,
    ultrathinkPromptControlled,
    ultrathinkInBodyText,
    hasAnyControls,
  } = getTraitsSectionVisibility({
    provider,
    models,
    model,
    prompt,
    modelOptions,
    allowPromptInjectedEffort,
  });
  const updateDescriptors = (nextDescriptors: ReadonlyArray<ProviderOptionDescriptor>) => {
    updateModelOptions(buildProviderOptionSelectionsFromDescriptors(nextDescriptors));
  };

  const handleSelectChange = (
    descriptor: Extract<ProviderOptionDescriptor, { type: "select" }>,
    value: string,
  ) => {
    if (!value) return;
    if (descriptor.promptInjectedValues?.includes(value)) {
      const nextPrompt =
        prompt.trim().length === 0
          ? ULTRATHINK_PROMPT_PREFIX
          : applyClaudePromptEffortPrefix(prompt, "ultrathink");
      onPromptChange(nextPrompt);
      return;
    }
    if (ultrathinkInBodyText && descriptor.id === primarySelectDescriptor?.id) return;
    if (ultrathinkPromptControlled && descriptor.id === primarySelectDescriptor?.id) {
      const stripped = prompt.replace(/^Ultrathink:\s*/i, "");
      onPromptChange(stripped);
    }
    updateDescriptors(replaceDescriptorCurrentValue(descriptors, descriptor.id, value));
  };

  if (!hasAnyControls) {
    return null;
  }

  return (
    <>
      {selectDescriptors.map((descriptor, index) => {
        const selectedValue =
          ultrathinkPromptControlled && descriptor.id === primarySelectDescriptor?.id
            ? "ultrathink"
            : (getDescriptorStringValue(descriptor) ?? "");

        return (
          <div key={descriptor.id}>
            {index > 0 ? <MenuDivider /> : null}
            <MenuGroup>
              <div className="px-2 pt-1.5 pb-1 font-medium text-muted-foreground text-xs">
                {descriptor.label}
              </div>
              {ultrathinkInBodyText && descriptor.id === primarySelectDescriptor?.id ? (
                <div className="px-2 pb-1.5 text-muted-foreground/80 text-xs">
                  Your prompt contains &quot;ultrathink&quot; in the text. Remove it to change this
                  option.
                </div>
              ) : null}
              <MenuRadioGroup
                value={selectedValue}
                onValueChange={(value) => handleSelectChange(descriptor, value)}
              >
                {descriptor.options.map((option) => (
                  <MenuRadioItem
                    key={option.id}
                    value={option.id}
                    hideIndicator
                    // Base UI keeps radio menus open by default. Close on pick so
                    // the traits menu behaves like the model picker.
                    closeOnClick
                    disabled={ultrathinkInBodyText && descriptor.id === primarySelectDescriptor?.id}
                  >
                    <span className="flex w-full min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {option.label}
                        {option.isDefault ? (
                          <>
                            {" "}
                            <DefaultBadge />
                          </>
                        ) : null}
                      </span>
                    </span>
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuGroup>
          </div>
        );
      })}
      {booleanDescriptors.map((descriptor, index) => {
        const selectedValue = descriptor.currentValue === true ? "on" : "off";

        return (
          <div key={descriptor.id}>
            {index > 0 || selectDescriptors.length > 0 ? <MenuDivider /> : null}
            <MenuGroup>
              <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
                {descriptor.label}
              </div>
              <MenuRadioGroup
                value={selectedValue}
                onValueChange={(value) => {
                  updateDescriptors(
                    replaceDescriptorCurrentValue(descriptors, descriptor.id, value === "on"),
                  );
                }}
              >
                {(["on", "off"] as const).map((value) => (
                  <MenuRadioItem key={value} value={value} hideIndicator closeOnClick>
                    <span className="flex w-full min-w-0 items-center justify-between gap-3">
                      <span>{value === "on" ? "On" : "Off"}</span>
                    </span>
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuGroup>
          </div>
        );
      })}
    </>
  );
});

/**
 * Build the traits trigger's text label plus whether the fast-mode bolt should
 * render. Fast mode is a lightning bolt when on and nothing at all when off —
 * "Normal" is the near-universal case and isn't worth the horizontal space. The
 * one exception is when fast mode is the only trait, where a bare bolt (or bare
 * chevron) would leave the trigger unreadable.
 */
export function buildTraitsTriggerDisplay(input: {
  provider: ProviderDriverKind;
  descriptors: ReadonlyArray<ProviderOptionDescriptor>;
  primarySelectDescriptorId: string | null;
  ultrathinkPromptControlled: boolean;
}): { label: string; showFastModeIcon: boolean } {
  let hasFastMode = false;
  let fastModeEnabled = false;
  const labels: Array<string> = [];
  for (const descriptor of input.descriptors) {
    if (descriptor.id === "fastMode" && descriptor.type === "boolean") {
      hasFastMode = true;
      fastModeEnabled = descriptor.currentValue === true;
      continue;
    }
    if (
      input.provider === "codex" &&
      descriptor.id === "serviceTier" &&
      descriptor.type === "select"
    ) {
      const currentValue = getProviderOptionCurrentValue(descriptor);
      const fastTier = descriptor.options.find(({ label }) => label === "Fast");
      if (fastTier && (currentValue === "default" || currentValue === fastTier.id)) {
        hasFastMode = true;
        fastModeEnabled = currentValue === fastTier.id;
        continue;
      }
    }
    const label =
      input.ultrathinkPromptControlled && descriptor.id === input.primarySelectDescriptorId
        ? "Ultrathink"
        : descriptor.type === "boolean"
          ? `${descriptor.label} ${descriptor.currentValue === true ? "On" : "Off"}`
          : getProviderOptionCurrentLabel(descriptor);
    if (typeof label === "string" && label.length > 0) {
      labels.push(label);
    }
  }

  // Only fall back to text when fast mode is genuinely the sole trait. Keying
  // off an empty label list alone would also catch descriptors that resolved to
  // no label at all, printing a bogus "Normal" for a model without fast mode.
  if (labels.length === 0 && hasFastMode) {
    return { label: fastModeEnabled ? "Fast" : "Normal", showFastModeIcon: false };
  }
  return { label: labels.join(" · "), showFastModeIcon: fastModeEnabled };
}

/**
 * The draggable control is for the common day-to-day effort range. Keep
 * provider-specific ultra modes available through Advanced without adding a
 * long-tail endpoint to the slider.
 */
export function getReasoningSliderOptions<T extends { id: string; label: string }>(
  options: ReadonlyArray<T>,
): ReadonlyArray<T> {
  return options.filter(
    (option) =>
      !option.id.toLowerCase().includes("ultra") && !option.label.toLowerCase().includes("ultra"),
  );
}

function ReasoningSlider(props: {
  options: ReadonlyArray<{ id: string; label: string }>;
  selectedValue: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  const pointerIdRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const selectedIndex = Math.max(
    0,
    props.options.findIndex((option) => option.id === props.selectedValue),
  );
  const lastIndex = Math.max(0, props.options.length - 1);
  const percentage = lastIndex === 0 ? 0 : (selectedIndex / lastIndex) * 100;
  const selectedOption = props.options[selectedIndex];

  const setValueFromClientX = (clientX: number, element: HTMLElement) => {
    if (props.disabled || props.options.length === 0) return;
    const bounds = element.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    const index = Math.round(ratio * lastIndex);
    const option = props.options[index];
    if (option) props.onValueChange(option.id);
  };

  const moveBy = (amount: number) => {
    const option = props.options[Math.min(lastIndex, Math.max(0, selectedIndex + amount))];
    if (option) props.onValueChange(option.id);
  };

  return (
    <div className="grid gap-2">
      <div className="relative h-9">
        <div
          role="slider"
          tabIndex={props.disabled ? -1 : 0}
          aria-label="Reasoning level"
          aria-valuemin={0}
          aria-valuemax={lastIndex}
          aria-valuenow={selectedIndex}
          aria-valuetext={selectedOption?.label ?? ""}
          aria-disabled={props.disabled}
          className="reasoning-selector-slider group absolute inset-x-4 inset-y-0 flex touch-none items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
          onKeyDown={(event) => {
            if (props.disabled) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              moveBy(-1);
            } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              moveBy(1);
            } else if (event.key === "Home") {
              event.preventDefault();
              const firstOption = props.options[0];
              if (firstOption) props.onValueChange(firstOption.id);
            } else if (event.key === "End") {
              event.preventDefault();
              const lastOption = props.options[lastIndex];
              if (lastOption) props.onValueChange(lastOption.id);
            }
          }}
          onPointerDown={(event) => {
            if (props.disabled) return;
            pointerIdRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsDragging(true);
            setValueFromClientX(event.clientX, event.currentTarget);
          }}
          onPointerMove={(event) => {
            if (pointerIdRef.current !== event.pointerId) return;
            setValueFromClientX(event.clientX, event.currentTarget);
          }}
          onPointerUp={(event) => {
            if (pointerIdRef.current !== event.pointerId) return;
            pointerIdRef.current = null;
            setIsDragging(false);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            pointerIdRef.current = null;
            setIsDragging(false);
          }}
        >
          <div className="absolute inset-x-0 h-5 rounded-full bg-muted/80 shadow-[inset_0_1px_2px_rgb(0_0_0/12%)]">
            <div
              className={cn(
                "reasoning-selector-fill absolute inset-y-0 left-0 rounded-full",
                isDragging &&
                  "will-change-[width] transition-[width] duration-100 ease-out motion-reduce:transition-none",
                !isDragging &&
                  "transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              )}
              style={{ width: `${percentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2.5">
              {props.options.map((option, index) => (
                <span
                  key={option.id}
                  className={cn(
                    "size-1.5 rounded-full transition-[background-color,scale] duration-150",
                    index <= selectedIndex ? "bg-primary-foreground/85" : "bg-foreground/25",
                    index === selectedIndex && "scale-125",
                  )}
                />
              ))}
            </div>
          </div>
          <span
            className={cn(
              "absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white shadow-md shadow-black/25 dark:border-white/40 dark:bg-zinc-100",
              !isDragging &&
                "transition-[left,scale,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:shadow-lg motion-reduce:transition-none",
              isDragging &&
                "will-change-[left] scale-110 shadow-lg transition-[left] duration-100 ease-out motion-reduce:transition-none",
            )}
            style={{ left: `${percentage}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="flex justify-between text-xs font-medium tracking-[-0.01em] text-muted-foreground/75">
        <span>{props.options[0]?.label ?? "Light"}</span>
        <span>{props.options[lastIndex]?.label ?? "Heavy"}</span>
      </div>
    </div>
  );
}

export const TraitsPicker = memo(function TraitsPicker({
  provider,
  instanceId,
  models,
  model,
  prompt,
  onPromptChange,
  modelOptions,
  allowPromptInjectedEffort = true,
  useReasoningSelector = false,
  triggerVariant,
  triggerClassName,
  ...persistence
}: TraitsMenuContentProps & TraitsPersistence) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { descriptors, primarySelectDescriptor, ultrathinkPromptControlled, ultrathinkInBodyText } =
    getTraitsSectionVisibility({
      provider,
      models,
      model,
      prompt,
      modelOptions,
      allowPromptInjectedEffort,
    });
  const setProviderModelOptions = useComposerDraftStore((store) => store.setProviderModelOptions);
  const updateModelOptions = useCallback(
    (nextOptions: ProviderOptions | undefined) => {
      if ("onModelOptionsChange" in persistence) {
        persistence.onModelOptionsChange(nextOptions);
        return;
      }
      const threadTarget = persistence.threadRef ?? persistence.draftId;
      if (!threadTarget) return;
      setProviderModelOptions(threadTarget, provider, nextOptions, {
        ...(instanceId ? { instanceId } : {}),
        model,
        persistSticky: true,
      });
    },
    [instanceId, model, persistence, provider, setProviderModelOptions],
  );
  if (
    !shouldRenderTraitsControls({
      provider,
      models,
      model,
      prompt,
      modelOptions,
      allowPromptInjectedEffort,
    })
  ) {
    return null;
  }

  const { label: triggerLabel, showFastModeIcon } = buildTraitsTriggerDisplay({
    provider,
    descriptors,
    primarySelectDescriptorId: primarySelectDescriptor?.id ?? null,
    ultrathinkPromptControlled,
  });
  const fastModeIcon = showFastModeIcon ? (
    <>
      <ComposerControlIcon
        icon={ZapIcon}
        className={cn(
          "fill-current opacity-80",
          provider === "claudeAgent" ? "text-[#d97757]" : "text-foreground",
        )}
      />
      <span className="sr-only">Fast mode on</span>
    </>
  ) : null;

  const reasoningLabel = ultrathinkPromptControlled
    ? "Ultrathink"
    : (getProviderOptionCurrentLabel(primarySelectDescriptor) ?? "Reasoning");
  const reasoningOptions = primarySelectDescriptor?.options ?? [];
  const reasoningSliderOptions = getReasoningSliderOptions(reasoningOptions);
  const selectedReasoningValue = getDescriptorStringValue(primarySelectDescriptor) ?? "";
  const selectedSliderValue = reasoningSliderOptions.some(
    (option) => option.id === selectedReasoningValue,
  )
    ? selectedReasoningValue
    : (reasoningSliderOptions[reasoningSliderOptions.length - 1]?.id ?? "");
  const updateReasoning = (value: string) => {
    if (!primarySelectDescriptor || !value) return;
    if (primarySelectDescriptor.promptInjectedValues?.includes(value)) {
      const nextPrompt =
        prompt.trim().length === 0
          ? ULTRATHINK_PROMPT_PREFIX
          : applyClaudePromptEffortPrefix(prompt, "ultrathink");
      onPromptChange(nextPrompt);
      return;
    }
    if (ultrathinkInBodyText) return;
    if (ultrathinkPromptControlled) onPromptChange(prompt.replace(/^Ultrathink:\s*/i, ""));
    updateModelOptions(
      buildProviderOptionSelectionsFromDescriptors(
        replaceDescriptorCurrentValue(descriptors, primarySelectDescriptor.id, value),
      ),
    );
  };

  if (useReasoningSelector && primarySelectDescriptor && reasoningSliderOptions.length > 0) {
    return (
      <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <PopoverTrigger
          render={
            <ComposerControl
              variant={triggerVariant ?? "ghost"}
              className={cn("shrink-0 whitespace-nowrap", triggerClassName)}
              aria-label={`Reasoning: ${reasoningLabel}`}
            />
          }
        >
          {fastModeIcon}
          <span>{reasoningLabel}</span>
          <ComposerControlChevron />
        </PopoverTrigger>
        <PopoverPopup
          side="top"
          align="start"
          sideOffset={8}
          className="w-56 border-0 bg-transparent p-0 shadow-none before:hidden [-webkit-backdrop-filter:none]! [--viewport-inline-padding:0] [backdrop-filter:none]!"
          viewportClassName="rounded-xl !overflow-hidden p-0"
        >
          <div className="reasoning-selector-popup dropdown-glass model-picker-surface grid gap-3 rounded-xl p-3 font-sans text-popover-foreground shadow-xl shadow-black/20">
            <div className="flex items-center justify-between text-sm leading-none tracking-[-0.01em]">
              <span className="font-medium text-muted-foreground">Reasoning</span>
              <span className="font-medium text-foreground">{reasoningLabel}</span>
            </div>
            <ReasoningSlider
              options={reasoningSliderOptions}
              selectedValue={selectedSliderValue}
              disabled={ultrathinkInBodyText}
              onValueChange={updateReasoning}
            />
            <Menu>
              <MenuTrigger
                render={
                  <button
                    type="button"
                    className="-mx-1 flex items-center gap-1 rounded-md px-1 py-1 text-left text-xs font-medium tracking-[-0.01em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Advanced reasoning options"
                  />
                }
              >
                Advanced
                <ChevronRightIcon className="size-3.5" aria-hidden="true" />
                <ZapIcon className="ms-auto size-3.5 text-muted-foreground" aria-hidden="true" />
              </MenuTrigger>
              <MenuPopup side="right" align="start" sideOffset={6}>
                <TraitsMenuContent
                  provider={provider}
                  {...(instanceId ? { instanceId } : {})}
                  models={models}
                  model={model}
                  prompt={prompt}
                  onPromptChange={onPromptChange}
                  modelOptions={modelOptions}
                  allowPromptInjectedEffort={allowPromptInjectedEffort}
                  {...persistence}
                />
              </MenuPopup>
            </Menu>
          </div>
        </PopoverPopup>
      </Popover>
    );
  }

  const isCodexStyle = provider === "codex";

  return (
    <Menu
      open={isMenuOpen}
      onOpenChange={(open) => {
        setIsMenuOpen(open);
      }}
    >
      <MenuTrigger
        render={
          <ComposerControl
            variant={triggerVariant ?? "ghost"}
            className={cn(
              isCodexStyle
                ? "min-w-0 max-w-40 shrink justify-start overflow-hidden whitespace-nowrap sm:max-w-48"
                : "shrink-0 whitespace-nowrap",
              triggerClassName,
            )}
          />
        }
      >
        {isCodexStyle ? (
          <span className="flex min-w-0 w-full items-center gap-1.5 overflow-hidden">
            {fastModeIcon}
            <span className="min-w-0 truncate">{triggerLabel}</span>
            <ComposerControlChevron />
          </span>
        ) : (
          <>
            {fastModeIcon}
            <span>{triggerLabel}</span>
            <ComposerControlChevron />
          </>
        )}
      </MenuTrigger>
      <MenuPopup align="start">
        <TraitsMenuContent
          provider={provider}
          {...(instanceId ? { instanceId } : {})}
          models={models}
          model={model}
          prompt={prompt}
          onPromptChange={onPromptChange}
          modelOptions={modelOptions}
          allowPromptInjectedEffort={allowPromptInjectedEffort}
          {...persistence}
        />
      </MenuPopup>
    </Menu>
  );
});
