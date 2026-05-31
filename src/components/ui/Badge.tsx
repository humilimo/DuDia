import { useMemo } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";
import { Text } from "./Text";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
}

export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const { tokens } = useTheme();
  const { base, tones } = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={[base.container, tones[tone]]}>
      {icon}
      <Text variant="caption" tone={tone === "neutral" ? "muted" : tone} style={base.label}>
        {label}
      </Text>
    </View>
  );
}

function makeStyles(t: Tokens) {
  const base = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 4,
      borderRadius: t.radius.pill,
      alignSelf: "flex-start",
    },
    label: { fontWeight: "800" },
  });
  const tones: Record<BadgeTone, ViewStyle> = {
    neutral: { backgroundColor: t.palette.surfaceMuted },
    primary: { backgroundColor: t.palette.primarySoft },
    success: { backgroundColor: t.palette.successSoft },
    warning: { backgroundColor: t.palette.warningSoft },
    danger: { backgroundColor: t.palette.dangerSoft },
  };
  return { base, tones };
}
