import { useState, useEffect, useCallback } from "react";
import { getCookie, setCookie } from "../locales";

export type ThemeMode = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    // 1. Check Cookie first
    const saved = getCookie("speed_theme");
    if (saved === "dark" || saved === "light") {
      return saved;
    }
    // 2. Follow system preference
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  });

  // Apply class to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  // If user hasn't manually set a cookie, listen to system preference changes
  useEffect(() => {
    const saved = getCookie("speed_theme");
    if (saved) return; // User made manual choice, don't override

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      // Only change if no cookie was saved in the meantime
      if (!getCookie("speed_theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const nextTheme: ThemeMode = prev === "dark" ? "light" : "dark";
      setCookie("speed_theme", nextTheme, 365);
      return nextTheme;
    });
  }, []);

  const setThemeExplicitly = useCallback((newTheme: ThemeMode) => {
    setTheme(newTheme);
    setCookie("speed_theme", newTheme, 365);
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme: setThemeExplicitly,
  };
}

