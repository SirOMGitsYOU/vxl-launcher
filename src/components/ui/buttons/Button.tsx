"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils";
import { Button as V2Button } from "../../ui-v2/Button";
import type { ComponentSize, ComponentVariant } from "../design-system";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ComponentVariant;
  size?: ComponentSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  shadowDepth?: "default" | "short" | "none";
  widthClassName?: string;
  heightClassName?: string;
  label?: string;
  description?: string;
}

function mapVariant(variant?: ComponentVariant): "primary" | "secondary" | "ghost" | "danger" {
  switch (variant) {
    case "destructive":
      return "danger";
    case "ghost":
      return "ghost";
    case "secondary":
    case "flat":
    case "flat-secondary":
      return "secondary";
    default:
      return "primary";
  }
}

function mapSize(size?: ComponentSize): "sm" | "md" | "lg" {
  if (size === "xs" || size === "sm") return "sm";
  if (size === "lg" || size === "xl") return "lg";
  return "md";
}

/** @deprecated Import from `../ui-v2` instead. Shim delegates to ui-v2 Button. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "default",
      size = "md",
      disabled = false,
      icon,
      iconPosition = "left",
      widthClassName,
      heightClassName,
      label,
      ...props
    },
    ref,
  ) => {
    const content = label ?? children;

    return (
      <V2Button
        ref={ref}
        variant={mapVariant(variant)}
        size={mapSize(size)}
        disabled={disabled}
        className={cn(widthClassName, heightClassName, className)}
        icon={iconPosition === "left" ? icon : undefined}
        {...props}
      >
        {content}
        {iconPosition === "right" && icon}
      </V2Button>
    );
  },
);

Button.displayName = "Button";
