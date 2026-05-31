import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance } from "react-native";
import { storageGet, storageSet } from "@/src/lib/storage/storage";
import { makeTokens, type Tokens } from "./tokens";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  tokens: Tokens;
  setMode: (mode: ThemeMode) => void;
}

const THEME_KEY = "feira:themeMode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(mode: ThemeMode, system: "light" | "dark" | null): "light" | "dark" {
  if (mode === "system") return system === "dark" ? "dark" : "light";
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [system, setSystem] = useState<"light" | "dark" | null>(() => {
    const scheme = Appearance.getColorScheme();
    return scheme === "dark" ? "dark" : scheme === "light" ? "light" : null;
  });

  useEffect(() => {
    void storageGet<ThemeMode | null>(THEME_KEY, null).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
      }
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme === "dark" ? "dark" : colorScheme === "light" ? "light" : null);
    });
    return () => sub.remove();
  }, []);

  const resolved = resolve(mode, system);
  const tokens = useMemo(() => makeTokens(resolved), [resolved]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolved,
      tokens,
      setMode: (next) => {
        setModeState(next);
        void storageSet(THEME_KEY, next);
      },
    }),
    [mode, resolved, tokens],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
