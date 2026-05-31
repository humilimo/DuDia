import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { Card, IconButton, Text, Badge } from "@/src/components/ui";
import { ProductAvatar } from "@/src/components/ProductAvatar";
import type { Product } from "@/src/types";
import { useTheme, type Tokens } from "@/src/theme";
import { fmtBRL } from "@/src/lib/domain/sales";

interface Props {
  product: Product;
  quantity: number;
  showControls: boolean;
  lowStockThreshold: number;
  onAdd: () => void;
  onRemove: () => void;
}

export function ProductRow({
  product,
  quantity,
  showControls,
  lowStockThreshold,
  onAdd,
  onRemove,
}: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const empty = product.stock <= 0;
  const low = !empty && product.stock <= lowStockThreshold;
  const tone = empty ? "danger" : low ? "warning" : "default";
  const reachedStock = quantity >= product.stock;

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
      </View>
      {showControls && quantity > 0 ? (
        <IconButton
          label={`Remover um ${product.name}`}
          tone="danger"
          icon={<Minus size={20} color={tokens.palette.danger} />}
          onPress={onRemove}
        />
      ) : null}
      {quantity > 0 ? (
        <View style={styles.qty} accessibilityLabel={`${quantity} no pedido`}>
          <Text variant="bodyStrong" tone="primary">
            {quantity}
          </Text>
        </View>
      ) : null}
      {showControls ? (
        <IconButton
          label={`Adicionar um ${product.name}`}
          tone="success"
          icon={<Plus size={20} color={tokens.palette.success} />}
          onPress={onAdd}
          disabled={empty || reachedStock}
        />
      ) : null}
    </Card>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    info: { flex: 1, gap: 2 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.xs, flexWrap: "wrap" },
    qty: {
      minWidth: 44,
      height: 44,
      borderRadius: t.radius.sm,
      backgroundColor: t.palette.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.spacing.sm,
    },
  });
}
