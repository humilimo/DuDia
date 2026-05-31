import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";
import { Text } from "./Text";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: SegmentedControlProps<T>) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens, size), [tokens, size]);

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && styles.pressed,
            ]}
          >
            {option.icon}
            <Text
              variant={size === "sm" ? "caption" : "bodyStrong"}
              tone={active ? "inverse" : "muted"}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(t: Tokens, size: "sm" | "md") {
  return StyleSheet.create({
    track: {
      flexDirection: "row",
      backgroundColor: t.palette.surfaceMuted,
      borderRadius: t.radius.pill,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingVertical: size === "sm" ? 8 : 10,
      paddingHorizontal: t.spacing.md,
      borderRadius: t.radius.pill,
      minHeight: size === "sm" ? 36 : 44,
    },
    segmentActive: { backgroundColor: t.palette.primary, ...t.shadows.sm },
    pressed: { opacity: 0.85 },
  });
}
