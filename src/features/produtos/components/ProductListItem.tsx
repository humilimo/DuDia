import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { Badge, Card, IconButton, QuantityStepper, Text } from "@/src/components/ui";
import { ProductAvatar } from "@/src/components/ProductAvatar";
import { store } from "@/src/lib/domain/store";
import { feedback } from "@/src/lib/utils/feedback";
import { fmtBRL } from "@/src/lib/domain/sales";
import { useTheme, type Tokens } from "@/src/theme";
import type { Product } from "@/src/types";

interface Props {
  product: Product;
  lowStockThreshold: number;
  onEdit: (product: Product) => void;
}

export function ProductListItem({ product, lowStockThreshold, onEdit }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const empty = product.stock <= 0;
  const low = !empty && product.stock <= lowStockThreshold;
  const tone = empty ? "danger" : low ? "warning" : "default";
  const hasCost =
    product.costPrice !== undefined && product.costPrice > 0;
  const profit = hasCost ? +(product.price - (product.costPrice ?? 0)).toFixed(2) : 0;
  const profitPositive = profit >= 0;

  return (
    <Card variant="flat" padding="sm" tone={tone} style={styles.row}>
      <ProductAvatar name={product.name} photo={product.photo} size={52} />
      <View style={styles.info}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.metaRow}>
          <Text variant="caption" tone="muted">
            {fmtBRL(product.price)}/{product.unit}
          </Text>
          {empty ? (
            <Badge label="Sem estoque" tone="danger" />
          ) : low ? (
            <Badge label={`${product.stock}${product.unit} · acabando`} tone="warning" />
          ) : (
            <Text variant="caption" tone="subtle">
              · {product.stock}
              {product.unit}
            </Text>
          )}
        </View>
        {hasCost ? (
          <Text variant="caption" tone={profitPositive ? "success" : "danger"}>
            Lucro: {profitPositive ? "+" : "−"}
            {fmtBRL(Math.abs(profit))}/{product.unit}
          </Text>
        ) : null}
        <QuantityStepper
          onDecrement={() => {
            store.adjustStock(product.id, -1);
            feedback("ok");
          }}
          onIncrement={() => {
            store.adjustStock(product.id, 1);
            feedback("ok");
          }}
          decrementDisabled={empty}
          incrementDisabled={false}
          decrementAccessibilityLabel={`Diminuir estoque de ${product.name}`}
          incrementAccessibilityLabel={`Aumentar estoque de ${product.name}`}
          style={styles.stepper}
        />
      </View>
      <IconButton
        label={`Editar ${product.name}`}
        tone="neutral"
        icon={<Pencil size={18} color={tokens.palette.foregroundMuted} />}
        onPress={() => onEdit(product)}
      />
    </Card>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
    info: { flex: 1, minWidth: 0, gap: t.spacing.xs },
    metaRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.xs, flexWrap: "wrap" },
    stepper: { marginTop: 2 },
  });
}
