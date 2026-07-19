"use client";

import { Logo } from "../ui/Logo";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
      <Logo forceAnimate size="sm" className="w-12 h-12" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
