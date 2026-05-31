import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";
import { Text } from "./Text";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.wrap}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text variant="heading" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="muted" style={styles.desc}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    wrap: {
      alignItems: "center",
      justifyContent: "center",
      padding: t.spacing.xxl,
      gap: t.spacing.sm,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: t.palette.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: t.spacing.sm,
    },
    title: { textAlign: "center" },
    desc: { textAlign: "center", maxWidth: 320 },
    action: { marginTop: t.spacing.md },
  });
}
