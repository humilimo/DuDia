import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";
import { Card } from "./Card";
import { Text } from "./Text";

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  trailing?: React.ReactNode;
  tone?: "default" | "primary" | "success";
}

export function StatCard({ label, value, hint, trailing, tone = "default" }: StatCardProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <Card variant="elevated" padding="md" style={styles.card}>
      <View style={styles.row}>
        <Text variant="overline" tone="muted">
          {label}
        </Text>
        {trailing}
      </View>
      <Text
        variant="title"
        tone={tone === "primary" ? "primary" : tone === "success" ? "success" : "default"}
        style={styles.value}
      >
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    card: { gap: t.spacing.xs },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    value: { fontSize: 26, lineHeight: 32 },
  });
}
