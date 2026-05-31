import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ShoppingBag } from "lucide-react-native";
import { Button, Text } from "@/src/components/ui";
import { useTheme, type Tokens } from "@/src/theme";
import { fmtBRL } from "@/src/lib/domain/sales";

interface Props {
  total: number;
  itemCount: number;
  onCheckout: () => void;
  onClearCart?: () => void;
  rightSlot?: React.ReactNode;
}

export function CartBar({ total, itemCount, onCheckout, onClearCart, rightSlot }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const showClear = itemCount > 0 && onClearCart;

  return (
    <View style={styles.wrap}>
      {showClear ? (
        <Button
          label="Limpar"
          variant="ghost"
          size="md"
          accessibilityLabel="Limpar pedido"
          onPress={onClearCart}
          style={styles.clearBtn}
        />
      ) : null}
      {total > 0 ? (
        <Button
          variant="success"
          size="lg"
          accessibilityLabel={`Ver pedido, total ${fmtBRL(total)}, ${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
          onPress={onCheckout}
          icon={<ShoppingBag size={20} color={tokens.palette.successForeground} />}
          style={styles.sellBtn}
        >
          <View style={styles.btnContent}>
            <Text variant="overline" tone="inverse">
              Ver pedido · {itemCount} {itemCount === 1 ? "item" : "itens"}
            </Text>
            <Text variant="display" tone="inverse" style={styles.totalText}>
              {fmtBRL(total)}
            </Text>
          </View>
        </Button>
      ) : null}
      {rightSlot}
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.md,
    },
    clearBtn: { flexShrink: 0 },
    sellBtn: { flex: 1, minHeight: 76, paddingVertical: t.spacing.md },
    btnContent: { alignItems: "center", flex: 1 },
    totalText: { fontSize: 26, lineHeight: 30 },
  });
}
