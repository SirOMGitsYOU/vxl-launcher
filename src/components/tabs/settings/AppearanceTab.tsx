"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "react-hot-toast";
import { cn } from "../../../lib/utils";
import { Button, Alert } from "../../ui-v2";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { SettingsSlider } from "../../ui/settings/SettingsSlider";
import EffectPreviewCard from "../../EffectPreviewCard";
import { SettingsSection } from "../../ui/settings/SettingsSection";
import { SettingRow } from "../../ui/settings/SettingRow";
import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../../store/background-effect-store";
import {
  type QualityLevel,
  useQualitySettingsStore,
} from "../../../store/quality-settings-store";
import { useThemeStore } from "../../../store/useThemeStore";
import {
  PRESET_BACKGROUNDS,
  getPresetThumbnailUrl,
} from "../../../config/preset-backgrounds";
import {
  getFileSizeBytes,
  importCustomBackground,
  isLargeBackgroundVideo,
  largeBackgroundVideoWarning,
} from "../../../services/background-media-service";
import { useSettingsConfig, useSettingsKeywords } from "./settings-context";

export function AppearanceTab() {
  const kw = useSettingsKeywords();
  const { saving } = useSettingsConfig();
  const {
    staticBackground,
    toggleStaticBackground,
    toggleBackgroundAnimation,
  } = useThemeStore();
  const {
    currentEffect,
    setCurrentEffect,
    customMediaUrl,
    customMediaType,
    customMediaBlur,
    customMediaQuality,
    customMediaOnlyOnPlay,
    customMediaHideEffects,
    presetBackgroundId,
    setCustomMedia,
    setPresetBackground,
    clearCustomBackground,
    setCustomMediaBlur,
    setCustomMediaQuality,
    setCustomMediaOnlyOnPlay,
    setCustomMediaHideEffects,
  } = useBackgroundEffectStore();
  const { qualityLevel, setQualityLevel, skinRenderer3d, setSkinRenderer3d } =
    useQualitySettingsStore();

  const [customBackgroundSizeBytes, setCustomBackgroundSizeBytes] = useState<
    number | null
  >(null);

  const hasCustomMedia =
    Boolean(customMediaUrl) ||
    (customMediaType === "youtube" && Boolean(presetBackgroundId));

  useEffect(() => {
    if (customMediaType !== "video" || !customMediaUrl) {
      setCustomBackgroundSizeBytes(null);
      return;
    }

    let cancelled = false;

    getFileSizeBytes(customMediaUrl)
      .then((size) => {
        if (!cancelled) setCustomBackgroundSizeBytes(size);
      })
      .catch(() => {
        if (!cancelled) setCustomBackgroundSizeBytes(null);
      });

    return () => {
      cancelled = true;
    };
  }, [customMediaUrl, customMediaType]);

  const backgroundOptions = [
    {
      id: BACKGROUND_EFFECTS.ENCHANTMENT_PARTICLES,
      name: "Enchantment Table",
      icon: "solar:magic-stick-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_GRID,
      name: "Nebula Grid",
      icon: "solar:widget-bold",
    },
    {
      id: BACKGROUND_EFFECTS.NEBULA_VOXELS,
      name: "Nebula Voxels",
      icon: "solar:asteroid-bold",
    },
    {
      id: BACKGROUND_EFFECTS.RETRO_GRID,
      name: "Retro Grid",
      icon: "solar:widget-5-bold",
    },
    {
      id: BACKGROUND_EFFECTS.RETRO_VOXEL_GRID,
      name: "Retro Voxel Grid",
      icon: "solar:widget-5-bold",
    },
    {
      id: BACKGROUND_EFFECTS.VOXEL_GRID,
      name: "Voxel Grid",
      icon: "solar:widget-bold",
    },
    {
      id: BACKGROUND_EFFECTS.PLAIN_BACKGROUND,
      name: "Plain Color",
      icon: "solar:palette-bold",
    },
  ];

  const handleSelectCustomBackground = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Media",
            extensions: ["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm"],
          },
        ],
      });

      if (!selected || typeof selected !== "string") return;

      const result = await importCustomBackground(selected);
      setCustomMedia(result.path, result.media_type);
      setCustomBackgroundSizeBytes(result.file_size_bytes);
      toast.success("Custom background applied");
      if (isLargeBackgroundVideo(result.media_type, result.file_size_bytes)) {
        toast(largeBackgroundVideoWarning(result.file_size_bytes), {
          icon: "⚠️",
          duration: 6000,
        });
      }
    } catch (error) {
      console.error("Failed to import custom background:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to import custom background",
      );
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_BACKGROUNDS.find((item) => item.id === presetId);
    if (!preset?.youtubeId.trim()) {
      toast.error("This preset has not been configured yet");
      return;
    }
    setPresetBackground(presetId);
    toast.success(`Applied ${preset.name}`);
  };

  const qualityLabels = ["Low", "Med", "High"] as const;
  const qualityIndex =
    qualityLevel === "low" ? 0 : qualityLevel === "medium" ? 1 : 2;

  const setQualityFromIndex = (value: number) => {
    const levels: QualityLevel[] = ["low", "medium", "high"];
    setQualityLevel(levels[value] ?? "medium");
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        id="settings-section-background"
        title="Background Effect"
        icon="solar:stars-bold"
        keywords={kw("background", "effect", "animation", "quality", "skin")}
        description="Choose a background effect for the launcher"
      >
        <SettingRow
          label="Animations"
          searchKeywords={kw("animations", "motion", "static")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={!staticBackground}
            onChange={() => {
              toggleStaticBackground();
              toggleBackgroundAnimation();
            }}
            disabled={saving}
            size="md"
          />
        </SettingRow>
        <SettingRow
          label="Skin animation"
          searchKeywords={kw("skin", "animation", "3d", "renderer")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={skinRenderer3d}
            onChange={() => setSkinRenderer3d(!skinRenderer3d)}
            disabled={saving}
            size="md"
          />
        </SettingRow>
        <SettingRow
          label="Effect quality"
          searchKeywords={kw("quality", "performance", "fps", "low", "high")}
          disabled={saving}
        >
          <SettingsSlider
            value={qualityIndex}
            onChange={setQualityFromIndex}
            min={0}
            max={2}
            step={1}
            disabled={saving}
            formatValue={(v) => qualityLabels[v] ?? "Med"}
          />
        </SettingRow>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
          {backgroundOptions.map((option) => (
            <EffectPreviewCard
              key={option.id}
              effectId={option.id}
              name={option.name}
              icon={option.icon}
              isActive={currentEffect === option.id}
              onClick={() => setCurrentEffect(option.id)}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-section-custom-background"
        title="Custom Background"
        icon="solar:gallery-bold"
        keywords={kw("custom", "background", "video", "image", "gif", "mp4")}
        description="Use your own image, GIF, or video on the Play screen"
      >
        <SettingRow
          label="Background file"
          searchKeywords={kw("select", "file", "import", "custom")}
        >
          <div className="flex items-center gap-2">
            {hasCustomMedia && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearCustomBackground();
                  toast.success("Custom background cleared");
                }}
              >
                <Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" />
                Clear
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSelectCustomBackground}>
              <Icon icon="solar:folder-open-bold" className="w-4 h-4" />
              {hasCustomMedia ? "Change file" : "Select file"}
            </Button>
          </div>
        </SettingRow>

        {customMediaType === "video" &&
          customBackgroundSizeBytes !== null &&
          isLargeBackgroundVideo("video", customBackgroundSizeBytes) && (
            <Alert
              tone="info"
              className="my-3 border-amber-500/30 bg-amber-500/10 text-amber-100"
            >
              {largeBackgroundVideoWarning(customBackgroundSizeBytes)}
            </Alert>
          )}

        {hasCustomMedia && (
          <>
            <SettingRow
              label="Blur"
              searchKeywords={kw("blur", "soft")}
            >
              <SettingsSlider
                value={customMediaBlur}
                onChange={setCustomMediaBlur}
                min={0}
                max={20}
                step={1}
                unit="px"
              />
            </SettingRow>
            <SettingRow
              label="Quality"
              searchKeywords={kw("quality", "performance")}
            >
              <SettingsSlider
                value={
                  customMediaQuality === "low"
                    ? 0
                    : customMediaQuality === "medium"
                      ? 1
                      : 2
                }
                onChange={(value) => {
                  const levels = ["low", "medium", "high"] as const;
                  setCustomMediaQuality(levels[value] ?? "medium");
                }}
                min={0}
                max={2}
                step={1}
                formatValue={(v) => qualityLabels[v] ?? "Med"}
              />
            </SettingRow>
            <SettingRow
              label="Only on Play tab"
              searchKeywords={kw("play", "tab", "only")}
            >
              <ToggleSwitch
                checked={customMediaOnlyOnPlay}
                onChange={() => setCustomMediaOnlyOnPlay(!customMediaOnlyOnPlay)}
                size="md"
              />
            </SettingRow>
            <SettingRow
              label="Hide background effects"
              searchKeywords={kw("hide", "effects")}
            >
              <ToggleSwitch
                checked={customMediaHideEffects}
                onChange={() => setCustomMediaHideEffects(!customMediaHideEffects)}
                size="md"
              />
            </SettingRow>
          </>
        )}
      </SettingsSection>

      <SettingsSection
        id="settings-section-presets"
        title="Preset Backgrounds"
        icon="solar:video-frame-bold"
        keywords={kw("preset", "youtube", "video", "background")}
        description="Looping video backgrounds via YouTube (configure IDs in preset config)"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3">
          {PRESET_BACKGROUNDS.map((preset) => {
            const thumbnail = getPresetThumbnailUrl(preset);
            const isActive = presetBackgroundId === preset.id;
            const isConfigured = Boolean(preset.youtubeId.trim());

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={cn(
                  "relative overflow-hidden rounded-xl border text-left transition-all h-28",
                  isActive
                    ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.08)]"
                    : "border-[var(--surface-border)] bg-[var(--surface-overlay)] hover:border-[var(--surface-border-strong)]",
                )}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={preset.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[var(--surface-base)] flex items-center justify-center">
                    <Icon
                      icon="solar:video-frame-bold"
                      className="w-8 h-8 text-[var(--text-muted)]"
                    />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-sm font-medium text-white">{preset.name}</p>
                  <p className="text-xs text-white/60">
                    {isConfigured ? "YouTube preset" : "Not configured"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}
