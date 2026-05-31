import { useMemo } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";
import { Text } from "./Text";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected, onPress, icon, style }: ChipProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text variant="caption" tone={selected ? "inverse" : "default"} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 36,
      paddingHorizontal: t.spacing.md,
      paddingVertical: 6,
      borderRadius: t.radius.pill,
    },
    unselected: {
      backgroundColor: t.palette.surfaceMuted,
      borderWidth: 1,
      borderColor: t.palette.border,
    },
    selected: { backgroundColor: t.palette.primary },
    pressed: { opacity: 0.8 },
    label: { fontWeight: "800" },
  });
}
