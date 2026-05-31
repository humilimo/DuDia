import { useMemo } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";

export function Divider({ style, ...rest }: ViewProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return <View {...rest} style={[styles.divider, style]} />;
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.palette.border },
  });
}
