import { useMemo } from "react";
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";

export type TextVariant = "display" | "title" | "heading" | "body" | "bodyStrong" | "caption" | "overline";
export type TextTone = "default" | "muted" | "subtle" | "primary" | "success" | "danger" | "warning" | "inverse";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

export function Text({ variant = "body", tone = "default", style, ...rest }: TextProps) {
  const { tokens } = useTheme();
  const { variants, tones } = useMemo(() => makeStyles(tokens), [tokens]);
  return <RNText {...rest} style={[variants[variant], tones[tone], style]} />;
}

function makeStyles(t: Tokens) {
  const variants: Record<TextVariant, TextStyle> = {
    display: t.typography.display,
    title: t.typography.title,
    heading: t.typography.heading,
    body: t.typography.body,
    bodyStrong: t.typography.bodyStrong,
    caption: t.typography.caption,
    overline: t.typography.overline,
  };
  const tones: Record<TextTone, TextStyle> = {
    default: { color: t.palette.foreground },
    muted: { color: t.palette.foregroundMuted },
    subtle: { color: t.palette.foregroundSubtle },
    primary: { color: t.palette.primary },
    success: { color: t.palette.success },
    danger: { color: t.palette.danger },
    warning: { color: t.palette.warning },
    inverse: { color: t.palette.primaryForeground },
  };
  return { variants, tones };
}
