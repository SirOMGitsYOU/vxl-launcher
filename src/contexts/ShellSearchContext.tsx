"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface ShellSearchContextValue {
  placeholder: string;
  query: string;
  setPlaceholder: (placeholder: string) => void;
  setQuery: (query: string) => void;
  onSearchChange?: (query: string) => void;
  setOnSearchChange: (handler: ((query: string) => void) | undefined) => void;
}

const ShellSearchContext = createContext<ShellSearchContextValue | null>(null);

export function ShellSearchProvider({ children }: { children: ReactNode }) {
  const [placeholder, setPlaceholder] = useState("Search...");
  const [query, setQuery] = useState("");
  const [onSearchChange, setOnSearchChange] = useState<
    ((query: string) => void) | undefined
  >();

  const handleSetQuery = (value: string) => {
    const nextValue = value ?? "";
    setQuery(nextValue);
    onSearchChange?.(nextValue);
  };

  return (
    <ShellSearchContext.Provider
      value={{
        placeholder,
        query,
        setPlaceholder,
        setQuery: handleSetQuery,
        onSearchChange,
        setOnSearchChange,
      }}
    >
      {children}
    </ShellSearchContext.Provider>
  );
}

export function useShellSearch() {
  const context = useContext(ShellSearchContext);
  if (!context) {
    throw new Error("useShellSearch must be used within ShellSearchProvider");
  }
  return context;
}

export function useShellSearchRegistration(options: {
  placeholder?: string;
  onSearchChange?: (query: string) => void;
}) {
  const { setPlaceholder, setOnSearchChange, setQuery } = useShellSearch();

  return {
    register: () => {
      if (options.placeholder) setPlaceholder(options.placeholder);
      setOnSearchChange(options.onSearchChange);
      setQuery("");
    },
    unregister: () => {
      setPlaceholder("Search...");
      setOnSearchChange(undefined);
      setQuery("");
    },
  };
}
