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
  compact?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  brand = "Dudia",
  trailing,
  compact = false,
  style,
  children,
  ...rest
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const isCompact = compact;
  const headerStyles = isCompact ? styles.headerCompact : styles.header;
  const topRowStyles = isCompact ? styles.topRowCompact : styles.topRow;
  const titleStyles = isCompact ? styles.titleCompact : styles.title;
  const subtitleStyles = isCompact ? styles.subtitleCompact : styles.subtitle;
  const verticalInset = isCompact ? tokens.spacing.sm : tokens.spacing.md;

  return (
    <View
      {...rest}
      style={[headerStyles, { paddingTop: insets.top + verticalInset }, style]}
    >
      <View style={topRowStyles}>
        <Text variant="overline" style={styles.brand}>
          {brand}
        </Text>
        {trailing}
      </View>
      {children}
      <Text variant="title" tone="inverse" style={titleStyles}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" style={subtitleStyles}>
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
    headerCompact: {
      backgroundColor: t.palette.primary,
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing.lg,
      borderBottomLeftRadius: t.radius.xl,
      borderBottomRightRadius: t.radius.xl,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: t.spacing.md,
    },
    topRowCompact: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: t.spacing.xs,
    },
    brand: {
      color: "rgba(255,255,255,0.75)",
    },
    title: {
      color: t.palette.primaryForeground,
      fontSize: 30,
      fontWeight: "900",
    },
    titleCompact: {
      color: t.palette.primaryForeground,
      fontSize: 22,
      lineHeight: 26,
      fontWeight: "800",
    },
    subtitle: {
      marginTop: t.spacing.xs,
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      fontWeight: "600",
    },
    subtitleCompact: {
      marginTop: t.spacing.xxs,
      color: "rgba(255,255,255,0.85)",
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
