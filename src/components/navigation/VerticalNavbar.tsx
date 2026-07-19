"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { Logo } from "../ui/Logo";
import { NavButton } from "../ui/nav/NavButton";
import { ChangelogModal } from "../modals/ChangelogModal";
import { AccountSelector } from "../account/AccountSelector";
import * as ConfigService from "../../services/launcher-config-service";

interface NavItem {
  id: string;
  icon: string;
  label: string;
  action?: () => void;
  disabled?: boolean;
}

interface VerticalNavbarProps {
  className?: string;
  items: NavItem[];
  activeItem?: string;
  onItemClick?: (id: string) => void;
  version?: string;
}

export function VerticalNavbar({
  className,
  items,
  activeItem,
  onItemClick,
}: VerticalNavbarProps) {
  const [active, setActive] = useState(activeItem || items[0]?.id);
  const navRef = useRef<HTMLDivElement>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  useEffect(() => {
    if (activeItem) {
      setActive(activeItem);
    }
  }, [activeItem]);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const fetchedVersion = await ConfigService.getAppVersion();
        setAppVersion(`v${fetchedVersion}`);
      } catch (error) {
        console.error("Failed to fetch app version:", error);
        setAppVersion("v?.?.?");
      }
    };
    fetchVersion();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".nav-item", {
        opacity: 0,
        x: -12,
        stagger: 0.04,
        duration: 0.35,
        ease: "power2.out",
      });
    }, navRef);

    return () => ctx.revert();
  }, []);

  const handleItemClick = (id: string, disabled?: boolean) => {
    if (disabled) return;
    setActive(id);
    onItemClick?.(id);
  };

  return (
    <>
      <div
        ref={navRef}
        className={cn(
          "flex flex-col w-56 h-full overflow-visible vxl-border border-y-0 border-l-0 bg-[var(--surface-raised)]",
          className,
        )}
      >
        <button
          type="button"
          className="w-full px-4 py-4 border-b border-[var(--surface-border)] hover:bg-white/5 transition-colors"
          onClick={() => setShowChangelogModal(true)}
        >
          <div className="flex items-center justify-center gap-3">
            <Logo size="sm" />
            <div className="vxl-brand-title text-center leading-tight">VXL Launcher</div>
          </div>
        </button>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {items.map((item) => (
            <div key={item.id} className="nav-item">
              <NavButton
                icon={<Icon icon={item.icon} className="w-5 h-5" />}
                label={item.label}
                isActive={active === item.id}
                isDisabled={item.disabled}
                onClick={() => handleItemClick(item.id, item.disabled)}
                title={item.disabled ? `${item.label} (requires an account)` : item.label}
                aria-label={item.label}
              />
            </div>
          ))}
        </nav>

        <div className="overflow-visible px-4 py-4 border-t border-[var(--surface-border)] space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            <span>Dev environment</span>
            <span className="flex items-center gap-1.5 text-[var(--accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              Enabled
            </span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">{appVersion || "v?.?.?"}</div>

          <AccountSelector />
        </div>
      </div>

      <ChangelogModal
        isOpen={showChangelogModal}
        onClose={() => setShowChangelogModal(false)}
      />
    </>
  );
}
