"use client";

import { useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "preferred-theme";

const getPreferredTheme = (defaultValue: boolean): boolean => {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme === "dark";
  }

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  return defaultValue;
};

export const usePersistentTheme = (defaultValue = true) => {
  const [isDark, setIsDark] = useState<boolean>(() =>
    getPreferredTheme(defaultValue),
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.classList.toggle("dark", isDark);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        isDark ? "dark" : "light",
      );
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((previous) => !previous);
  }, []);

  const setTheme = useCallback((value: "dark" | "light") => {
    setIsDark(value === "dark");
  }, []);

  return { isDark, toggleTheme, setTheme } as const;
};
