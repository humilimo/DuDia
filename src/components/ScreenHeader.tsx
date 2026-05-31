import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme";

interface Props extends ViewProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, children, style, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }, style]} {...rest}>
      <Text style={styles.brand}>Dudia</Text>
      {children}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  brand: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.primaryForeground,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
});
