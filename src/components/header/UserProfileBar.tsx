"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";
import { RunningInstancesIndicator } from "../process/RunningInstancesIndicator";

interface UserProfileBarProps {
  className?: string;
}

export function UserProfileBar({ className }: UserProfileBarProps) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".profile-bar-container", {
        opacity: 0,
        y: -10,
        duration: 0.5,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className={cn("relative flex items-center gap-3", className)}>
      <div className="profile-bar-container flex items-center gap-2">
        <RunningInstancesIndicator />
      </div>
    </div>
  );
}
