import type { TextStyle } from "react-native";

export interface Palette {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  primary: string;
  primaryForeground: string;
  primarySoft: string;
  primaryStrong: string;
  accent: string;
  accentForeground: string;
  success: string;
  successForeground: string;
  successSoft: string;
  warning: string;
  warningForeground: string;
  warningSoft: string;
  danger: string;
  dangerForeground: string;
  dangerSoft: string;
  overlay: string;
  shadow: string;
}

export const lightPalette: Palette = {
  background: "#f4f6fb",
  backgroundElevated: "#ffffff",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  surfaceMuted: "#eef2f8",
  border: "#dbe2ee",
  borderStrong: "#c2cbdb",
  foreground: "#0f1f3a",
  foregroundMuted: "#4b5a76",
  foregroundSubtle: "#7a8aa3",
  primary: "#1f5af0",
  primaryForeground: "#ffffff",
  primarySoft: "#e3ecff",
  primaryStrong: "#1640b8",
  accent: "#7b3ff7",
  accentForeground: "#ffffff",
  success: "#159d5e",
  successForeground: "#ffffff",
  successSoft: "#dff4e8",
  warning: "#e08a13",
  warningForeground: "#3a2400",
  warningSoft: "#fce7c2",
  danger: "#dc3a3a",
  dangerForeground: "#ffffff",
  dangerSoft: "#fbdcdc",
  overlay: "rgba(8, 14, 28, 0.55)",
  shadow: "rgba(13, 26, 56, 0.12)",
};

export const darkPalette: Palette = {
  background: "#0b1220",
  backgroundElevated: "#11192a",
  surface: "#141d33",
  surfaceElevated: "#1a2540",
  surfaceMuted: "#1a2540",
  border: "#23304f",
  borderStrong: "#324269",
  foreground: "#f4f7ff",
  foregroundMuted: "#a9b4cc",
  foregroundSubtle: "#7c89a8",
  primary: "#5c8bff",
  primaryForeground: "#0b1220",
  primarySoft: "#1d2a4d",
  primaryStrong: "#7da3ff",
  accent: "#a78bfa",
  accentForeground: "#0b1220",
  success: "#3fcf86",
  successForeground: "#04210f",
  successSoft: "#163627",
  warning: "#f5b242",
  warningForeground: "#2a1a00",
  warningSoft: "#3b2a0f",
  danger: "#ff6b6b",
  dangerForeground: "#260606",
  dangerSoft: "#3a1818",
  overlay: "rgba(0, 0, 0, 0.6)",
  shadow: "rgba(0, 0, 0, 0.55)",
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const typography = {
  display: { fontSize: 36, lineHeight: 42, fontWeight: "900" } as TextStyle,
  title: { fontSize: 24, lineHeight: 30, fontWeight: "800" } as TextStyle,
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "800" } as TextStyle,
  body: { fontSize: 16, lineHeight: 22, fontWeight: "500" } as TextStyle,
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: "700" } as TextStyle,
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" } as TextStyle,
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  } as TextStyle,
} as const;

export interface Tokens {
  palette: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  typography: typeof typography;
  mode: "light" | "dark";
}

export function makeTokens(mode: "light" | "dark"): Tokens {
  return {
    palette: mode === "dark" ? darkPalette : lightPalette,
    spacing,
    radius,
    shadows,
    typography,
    mode,
  };
}
