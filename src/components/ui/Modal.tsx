"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useThemeStore } from "../../store/useThemeStore";
import { IconButton } from "../ui-v2/IconButton";

interface ModalProps {
  title: string;
  titleIcon?: React.ReactNode;
  titleSubtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnClickOutside?: boolean;
  headerActions?: React.ReactNode;
  variant?: "default" | "flat" | "3d";
  className?: string;
  contentClassName?: string;
  zIndex?: number;
}

export function Modal({
  title,
  titleIcon,
  titleSubtitle,
  onClose,
  children,
  footer,
  width = "md",
  closeOnClickOutside = true,
  headerActions,
  variant = "default",
  className,
  contentClassName,
  zIndex = 1000,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = useCallback(() => {
    setIsClosing((closing) => {
      if (closing) {
        return closing;
      }
      onClose();
      return true;
    });
  }, [onClose]);
  const dialogRef = useFocusTrap(true, handleClose);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isClosing) {
        handleClose();
      }
    };
    
    if (closeOnClickOutside !== false) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeOnClickOutside, isClosing]);

  useEffect(() => {
    const recordMouseDownTarget = (event: MouseEvent) => {
      mouseDownTargetRef.current = event.target;
    };

    document.addEventListener('mousedown', recordMouseDownTarget, true);

    return () => {
      document.removeEventListener('mousedown', recordMouseDownTarget, true);
      mouseDownTargetRef.current = null;
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (
      closeOnClickOutside &&
      e.target === modalRef.current &&
      mouseDownTargetRef.current === modalRef.current &&
      !isClosing
    ) {
      e.stopPropagation();
      handleClose();
    }
  };

  const widthClasses = {
    sm: "max-w-lg",
    md: "max-w-2xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[95vw] w-full",
  };

  const getBorderClasses = () => {
    if (variant === "3d") {
      return "border-2 border-b-4";
    }
    return "border border-b-2";
  };

  const getBoxShadow = () => {
    if (variant === "3d") {
      return `0 10px 0 rgba(0,0,0,0.3), 0 15px 25px rgba(0,0,0,0.5), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`;
    }
    return "none";
  };
  return (
    <div
      ref={modalRef}
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md-anyos"
      style={{ zIndex }}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative flex flex-col w-full rounded-xl overflow-hidden max-h-[90vh] border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-lg",
          widthClasses[width],
          className,
        )}
      >
        {variant === "3d" && (
          <span
            className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
            style={{ backgroundColor: `${accentColor.value}80` }}
          />
        )}

        <div
          ref={headerRef}
          className="flex items-center justify-between px-6 py-4 border-b border-[var(--surface-border)] flex-shrink-0 bg-[var(--surface-overlay)]"
        >
          <div className="flex items-center space-x-3">
            {titleIcon && (
              <span className="text-white flex-shrink-0">
                {titleIcon}
              </span>
            )}
            <div className="flex flex-col">
              <h2 id="modal-title" className="text-lg font-semibold text-white">
                {title}
              </h2>
              {titleSubtitle && <div className="mt-0.5">{titleSubtitle}</div>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {headerActions}
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              size="sm"
              aria-label="Close modal"
            >
              <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
            </IconButton>
          </div>
        </div>

        <div
          ref={contentRef}
          className={cn("flex-1 overflow-y-auto custom-scrollbar", contentClassName)}
        >
          {children}
        </div>

        {footer && (
          <div className="flex-shrink-0">
            <div className="border-t border-[var(--surface-border)] mx-6 mt-4 mb-4"></div>
            <div className="px-6 pb-4">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
