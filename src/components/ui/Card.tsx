import { useMemo } from "react";
import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";

export type CardVariant = "flat" | "elevated" | "outlined";
export type CardTone = "default" | "warning" | "danger" | "success" | "primary";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: CardPadding;
  tone?: CardTone;
}

export function Card({
  variant = "flat",
  padding = "md",
  tone = "default",
  style,
  children,
  ...rest
}: CardProps) {
  const { tokens } = useTheme();
  const { base, variants, tones, paddings } = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View
      {...rest}
      style={[base.card, variants[variant], tones[tone], paddings[padding], style]}
    >
      {children}
    </View>
  );
}

function makeStyles(t: Tokens) {
  const base = StyleSheet.create({
    card: { borderRadius: t.radius.lg },
  });
  const variants: Record<CardVariant, ViewStyle> = {
    flat: { backgroundColor: t.palette.surface },
    elevated: { backgroundColor: t.palette.surfaceElevated, ...t.shadows.md },
    outlined: {
      backgroundColor: t.palette.surface,
      borderWidth: 1,
      borderColor: t.palette.border,
    },
  };
  const tones: Record<CardTone, ViewStyle> = {
    default: {},
    warning: {
      backgroundColor: t.palette.warningSoft,
      borderWidth: 1,
      borderColor: t.palette.warning,
    },
    danger: {
      backgroundColor: t.palette.dangerSoft,
      borderWidth: 1,
      borderColor: t.palette.danger,
    },
    success: {
      backgroundColor: t.palette.successSoft,
      borderWidth: 1,
      borderColor: t.palette.success,
    },
    primary: { backgroundColor: t.palette.primarySoft },
  };
  const paddings: Record<CardPadding, ViewStyle> = {
    none: { padding: 0 },
    sm: { padding: t.spacing.md },
    md: { padding: t.spacing.lg },
    lg: { padding: t.spacing.xl },
  };
  return { base, variants, tones, paddings };
}
