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
}: SearchWithFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearchEnter) {
      onSearchEnter(searchValue);
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-4 py-2.5 transition-colors hover:border-[var(--surface-border-strong)]">
        <StableIcon icon={searchIcon} className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
        />

        {showSort && sortOptions.length > 0 && onSortChange ? (
          <>
            <div className="mx-1 h-4 w-px bg-[var(--surface-border)]" />
            <CustomDropdown
              value={sortValue}
              onChange={onSortChange}
              options={sortOptions}
              className="w-auto shrink-0"
              variant="search"
            />
          </>
        ) : null}

        {showFilter && filterOptions.length > 0 && onFilterChange ? (
          <>
            <div className="mx-1 h-4 w-px bg-[var(--surface-border)]" />
            <CustomDropdown
              value={filterValue}
              onChange={onFilterChange}
              options={filterOptions}
              className="w-auto shrink-0"
              variant="search"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
