"use client";

import { useEffect } from "react";
import { useShellSearch } from "../contexts/ShellSearchContext";

export function useShellSearchTab(
  placeholder: string,
  onSearchChange?: (query: string) => void,
) {
  const { setPlaceholder, setOnSearchChange, setQuery } = useShellSearch();

  useEffect(() => {
    setPlaceholder(placeholder);
    setOnSearchChange(onSearchChange);
    setQuery("");

    return () => {
      setPlaceholder("Search...");
      setOnSearchChange(undefined);
      setQuery("");
    };
  }, [placeholder, onSearchChange, setPlaceholder, setOnSearchChange, setQuery]);
}
