"use client";

import type React from "react";
import { cn } from "../../lib/utils";
import { Card } from "./Card";

interface SettingsSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({ children, className }: SettingsSectionProps) {
  return (
    <Card className={cn("p-5", className)}>
      {children}
    </Card>
  );
}
