export { ThemeProvider, useTheme, type ThemeMode } from "./ThemeProvider";
export {
  lightPalette,
  darkPalette,
  spacing,
  radius,
  shadows,
  typography,
  makeTokens,
  type Tokens,
  type Palette,
} from "./tokens";

import { lightPalette } from "./tokens";

/**
 * Legacy color export kept for backwards compatibility while screens
 * are being migrated to `useTheme()`. New code should use the theme hook.
 * @deprecated Use `useTheme().tokens.palette` instead.
 */
export const colors = {
  background: lightPalette.background,
  foreground: lightPalette.foreground,
  card: lightPalette.surface,
  primary: lightPalette.primary,
  primaryForeground: lightPalette.primaryForeground,
  primarySoft: lightPalette.primarySoft,
  success: lightPalette.success,
  successForeground: lightPalette.successForeground,
  danger: lightPalette.danger,
  dangerForeground: lightPalette.dangerForeground,
  warning: lightPalette.warning,
  warningForeground: lightPalette.warningForeground,
  muted: lightPalette.surfaceMuted,
  mutedForeground: lightPalette.foregroundMuted,
  border: lightPalette.border,
};
