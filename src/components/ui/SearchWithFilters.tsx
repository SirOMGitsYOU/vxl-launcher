"use client";

import { Icon } from "@iconify/react";
import { StableIcon } from "./IconWrapper";
import { CustomDropdown } from "./CustomDropdown";
import type { DropdownOption } from "./CustomDropdown";
import { cn } from "../../lib/utils";

export interface SearchWithFiltersProps {
  placeholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchEnter?: (value: string) => void;
  sortOptions?: DropdownOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  filterOptions?: DropdownOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  className?: string;
  searchIcon?: string;
  showSort?: boolean;
  showFilter?: boolean;
  onFilterToggle?: () => void;
  isFilterActive?: boolean;
  filterBadgeCount?: number;
}

export function SearchWithFilters({
  placeholder = "Search...",
  searchValue = "",
  onSearchChange,
  onSearchEnter,
  sortOptions = [],
  sortValue = "",
  onSortChange,
  filterOptions = [],
  filterValue = "",
  onFilterChange,
  className = "",
  searchIcon = "solar:magnifer-bold",
  showSort = true,
  showFilter = true,
  onFilterToggle,
  isFilterActive = false,
  filterBadgeCount = 0,
}: SearchWithFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearchEnter) {
      onSearchEnter(searchValue);
    }
  };

  const showFilterDropdown =
    showFilter && filterOptions.length > 0 && Boolean(onFilterChange);
  const showFilterToggle = Boolean(onFilterToggle);

  return (
    <div
      className={cn(
        "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3",
        "transition-colors hover:border-[var(--surface-border-strong)]",
        className,
      )}
    >
      <StableIcon icon={searchIcon} className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchValue}
        onChange={handleSearchChange}
        onKeyDown={handleSearchKeyDown}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
      />

      {showSort && sortOptions.length > 0 && onSortChange ? (
        <>
          <div className="mx-0.5 h-4 w-px shrink-0 bg-[var(--surface-border)]" />
          <CustomDropdown
            value={sortValue}
            onChange={onSortChange}
            options={sortOptions}
            className="w-auto shrink-0"
            variant="search"
          />
        </>
      ) : null}

      {showFilterDropdown ? (
        <>
          <div className="mx-0.5 h-4 w-px shrink-0 bg-[var(--surface-border)]" />
          <CustomDropdown
            value={filterValue}
            onChange={onFilterChange}
            options={filterOptions}
            className="w-auto shrink-0"
            variant="search"
          />
        </>
      ) : null}

      {showFilterToggle ? (
        <>
          <div className="mx-0.5 h-4 w-px shrink-0 bg-[var(--surface-border)]" />
          <button
            type="button"
            onClick={onFilterToggle}
            title={isFilterActive ? "Hide filters" : "Show filters"}
            className={cn(
              "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
              isFilterActive || filterBadgeCount > 0
                ? "bg-[rgba(var(--accent-rgb),0.18)] text-white"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-base)] hover:text-white",
            )}
          >
            <Icon icon="solar:filter-bold" className="h-4 w-4" />
            {filterBadgeCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-semibold leading-none text-black">
                {filterBadgeCount > 9 ? "9+" : filterBadgeCount}
              </span>
            ) : null}
          </button>
        </>
      ) : null}
    </div>
  );
}
