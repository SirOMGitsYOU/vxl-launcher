"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { cardBase, cardInteractive, cardSelected } from "./tokens";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, selected = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardBase,
          interactive && cardInteractive,
          selected && cardSelected,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
