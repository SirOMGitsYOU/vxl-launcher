"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { LoadingSpinner, SpinnerRing } from "./LoadingSpinner";
import { SelectTab } from "../ui-v2/SelectTab";
import { ToggleSwitch } from "./ToggleSwitch";
import { SectionHeader } from "../ui-v2/SectionHeader";

const sizes = ["xs", "sm", "md", "lg", "xl", "xxl"] as const;
const shadowDepths = ["none", "short", "default"] as const;

type SpinnerSize = (typeof sizes)[number];
type ShadowDepth = (typeof shadowDepths)[number];

export function LoadingSpinnerPreview() {
  const [size, setSize] = useState<SpinnerSize>("md");
  const [shadowDepth, setShadowDepth] = useState<ShadowDepth>("none");
  const [showMessage, setShowMessage] = useState(true);
  const [showGallery, setShowGallery] = useState(false);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Loading spinner"
        description="Preview the animated VXL logo loader used in skins, capes, and overlays."
        icon="solar:refresh-circle-bold"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">Size</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((option) => (
                <SelectTab
                  key={option}
                  active={size === option}
                  onClick={() => setSize(option)}
                >
                  {option}
                </SelectTab>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">Frame</p>
            <div className="flex flex-wrap gap-2">
              {shadowDepths.map((option) => (
                <SelectTab
                  key={option}
                  active={shadowDepth === option}
                  onClick={() => setShadowDepth(option)}
                >
                  {option}
                </SelectTab>
              ))}
            </div>
          </div>

          <ToggleSwitch
            label="Show message"
            checked={showMessage}
            onChange={setShowMessage}
          />

          <ToggleSwitch
            label="Show size gallery"
            checked={showGallery}
            onChange={setShowGallery}
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Live preview</p>
          <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface-base)]">
            <LoadingSpinner
              size={size}
              shadowDepth={shadowDepth}
              showMessage={showMessage}
              message="Loading..."
            />
          </div>

          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-[var(--text-muted)]">
              Inline preview (skin / cape card)
            </p>
            <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface-base)]">
              <LoadingSpinner
                size="md"
                shadowDepth="none"
                showMessage={showMessage}
                message="Loading Cape..."
              />
            </div>
          </div>
        </div>
      </div>

      {showGallery && (
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Icon icon="solar:gallery-bold" className="h-4 w-4" />
            All logo sizes
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {sizes.map((option) => (
              <div
                key={option}
                className={cn(
                  "flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-base)] p-3",
                  size === option && "ring-1 ring-[var(--accent)]",
                )}
              >
                <SpinnerRing size={option} />
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {option}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
