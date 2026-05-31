import { useMemo } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, type Tokens } from "@/src/theme";
import { Text } from "./Text";

export interface ScreenHeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  brand?: string;
  trailing?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  brand = "Dudia",
  trailing,
  style,
  children,
  ...rest
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <View
      {...rest}
      style={[styles.header, { paddingTop: insets.top + tokens.spacing.md }, style]}
    >
      <View style={styles.topRow}>
        <Text variant="overline" style={styles.brand}>
          {brand}
        </Text>
        {trailing}
      </View>
      {children}
      <Text variant="title" tone="inverse" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    header: {
      backgroundColor: t.palette.primary,
      paddingHorizontal: t.spacing.xxl,
      paddingBottom: t.spacing.xxl,
      borderBottomLeftRadius: t.radius.xl,
      borderBottomRightRadius: t.radius.xl,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: t.spacing.md,
    },
    brand: {
      color: "rgba(255,255,255,0.75)",
    },
    title: {
      color: t.palette.primaryForeground,
      fontSize: 30,
      fontWeight: "900",
    },
    subtitle: {
      marginTop: t.spacing.xs,
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      fontWeight: "600",
    },
  });
}
