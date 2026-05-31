import { useMemo } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { useTheme, type Tokens } from "@/src/theme";

const ROW_H = 32;
const ICON = 16;

export interface QuantityStepperProps {
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementAccessibilityLabel: string;
  incrementAccessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function QuantityStepper({
  onDecrement,
  onIncrement,
  decrementDisabled = false,
  incrementDisabled = false,
  decrementAccessibilityLabel,
  incrementAccessibilityLabel,
  style,
}: QuantityStepperProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <View style={[styles.wrap, style]} accessibilityRole="toolbar">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decrementAccessibilityLabel}
        accessibilityState={{ disabled: decrementDisabled }}
        disabled={decrementDisabled}
        onPress={onDecrement}
        hitSlop={8}
        style={({ pressed }) => [styles.hit, pressed && !decrementDisabled && styles.hitPressed]}
      >
        <Minus size={ICON} color={tokens.palette.foregroundMuted} />
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={incrementAccessibilityLabel}
        accessibilityState={{ disabled: incrementDisabled }}
        disabled={incrementDisabled}
        onPress={onIncrement}
        hitSlop={8}
        style={({ pressed }) => [styles.hit, pressed && !incrementDisabled && styles.hitPressed]}
      >
        <Plus size={ICON} color={tokens.palette.foregroundMuted} />
      </Pressable>
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      height: ROW_H,
      borderRadius: t.radius.pill,
      backgroundColor: t.palette.surfaceMuted,
      overflow: "hidden",
      alignSelf: "stretch",
    },
    hit: {
      flex: 1,
      height: ROW_H,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 34,
    },
    hitPressed: {
      backgroundColor: t.palette.border,
    },
    divider: {
      width: 1,
      height: 18,
      backgroundColor: t.palette.borderStrong,
    },
  });
}
