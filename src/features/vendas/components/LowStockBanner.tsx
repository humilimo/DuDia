import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { Card, Text } from "@/src/components/ui";
import type { Product } from "@/src/types";
import { useTheme, type Tokens } from "@/src/theme";

interface Props {
  products: Product[];
}

export function LowStockBanner({ products }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  if (products.length === 0) return null;
  return (
    <Card tone="warning" padding="sm" style={styles.card}>
      <AlertTriangle size={20} color={tokens.palette.warning} />
      <View style={styles.body}>
        <Text variant="overline" tone="warning">
          Estoque acabando
        </Text>
        <Text variant="caption" tone="default" numberOfLines={2}>
          {products.map((p) => p.name).join(", ")}
        </Text>
      </View>
    </Card>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    card: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
    body: { flex: 1 },
  });
}
