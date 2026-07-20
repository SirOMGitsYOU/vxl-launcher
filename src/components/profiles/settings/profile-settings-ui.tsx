"use client";

import { ToggleSwitch } from "../../ui/ToggleSwitch";

export const fieldLabelClass = "mb-2 block text-sm font-medium text-[var(--text-secondary)]";

interface ProfileSettingToggleProps {
  label: string;
  description?: string;
  helperText?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ProfileSettingToggle({
  label,
  description,
  helperText,
  checked,
  onChange,
  disabled,
}: ProfileSettingToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
        )}
        {helperText && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">{helperText}</p>
        )}
      </div>
      <ToggleSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size="sm"
        className="mt-0.5 flex-shrink-0"
      />
    </div>
  );
}
