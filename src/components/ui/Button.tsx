import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTheme, type Tokens } from "@/src/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  label?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

interface VariantStyle {
  container: ViewStyle;
  text: TextStyle;
}

interface SizeStyle {
  container: ViewStyle;
  text: TextStyle;
}

export function Button({
  label,
  icon,
  iconPosition = "left",
  variant = "primary",
  size = "md",
  loading,
  fullWidth,
  disabled,
  style,
  textStyle,
  children,
  accessibilityRole = "button",
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { tokens } = useTheme();
  const { base, variants, sizes } = useMemo(() => makeStyles(tokens), [tokens]);
  const variantStyles = variants[variant];
  const sizeStyles = sizes[size];

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      hitSlop={8}
      {...rest}
      style={({ pressed }) => [
        base.container,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && base.fullWidth,
        (disabled || loading) && base.disabled,
        pressed && base.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color as string} />
      ) : (
        <>
          {iconPosition === "left" && icon}
          {children ?? (label ? (
            <Text style={[variantStyles.text, sizeStyles.text, textStyle]} numberOfLines={1}>
              {label}
            </Text>
          ) : null)}
          {iconPosition === "right" && icon}
        </>
      )}
    </Pressable>
  );
}

function makeStyles(t: Tokens) {
  const base = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      minHeight: 48,
      paddingHorizontal: t.spacing.lg,
      borderRadius: t.radius.md,
    },
    fullWidth: { alignSelf: "stretch" },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  });
  const sizes: Record<ButtonSize, SizeStyle> = {
    sm: {
      container: { minHeight: 40, paddingHorizontal: t.spacing.md, borderRadius: t.radius.sm },
      text: { fontSize: 14, fontWeight: "700" },
    },
    md: {
      container: { minHeight: 48 },
      text: { fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
    },
    lg: {
      container: { minHeight: 56, paddingHorizontal: t.spacing.xl, borderRadius: t.radius.lg },
      text: { fontSize: 17, fontWeight: "900", letterSpacing: 0.4 },
    },
  };
  const variants: Record<ButtonVariant, VariantStyle> = {
    primary: {
      container: { backgroundColor: t.palette.primary, ...t.shadows.sm },
      text: { color: t.palette.primaryForeground },
    },
    secondary: {
      container: {
        backgroundColor: t.palette.surface,
        borderWidth: 1,
        borderColor: t.palette.border,
      },
      text: { color: t.palette.foreground },
    },
    ghost: {
      container: { backgroundColor: "transparent" },
      text: { color: t.palette.primary },
    },
    success: {
      container: { backgroundColor: t.palette.success, ...t.shadows.sm },
      text: { color: t.palette.successForeground },
    },
    danger: {
      container: { backgroundColor: t.palette.danger, ...t.shadows.sm },
      text: { color: t.palette.dangerForeground },
    },
  };
  return { base, sizes, variants };
}
