import { useMemo } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";

export function ScreenContainer({ style, children, ...rest }: ViewProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View {...rest} style={[styles.screen, style]}>
      {children}
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.palette.background },
  });
}
