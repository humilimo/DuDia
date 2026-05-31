import { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme, type Tokens } from "@/src/theme";

export type IconButtonTone = "neutral" | "primary" | "success" | "danger" | "warning";
export type IconButtonSize = 40 | 44 | 48 | 56;

export interface IconButtonProps extends Omit<PressableProps, "style"> {
  icon: React.ReactNode;
  tone?: IconButtonTone;
  size?: IconButtonSize;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
  label: string;
}

export function IconButton({
  icon,
  tone = "neutral",
  size = 44,
  filled = true,
  disabled,
  style,
  label,
  ...rest
}: IconButtonProps) {
  const { tokens } = useTheme();
  const { base, fills } = useMemo(() => makeStyles(tokens, size), [tokens, size]);
  const toneStyle: ViewStyle = filled ? fills[tone] : { backgroundColor: "transparent" };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        base.container,
        toneStyle,
        disabled && base.disabled,
        pressed && base.pressed,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

function makeStyles(t: Tokens, size: number) {
  const base = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: t.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
  });
  const fills: Record<IconButtonTone, ViewStyle> = {
    neutral: { backgroundColor: t.palette.surfaceMuted },
    primary: { backgroundColor: t.palette.primarySoft },
    success: { backgroundColor: t.palette.successSoft },
    danger: { backgroundColor: t.palette.dangerSoft },
    warning: { backgroundColor: t.palette.warningSoft },
  };
  return { base, fills };
}
