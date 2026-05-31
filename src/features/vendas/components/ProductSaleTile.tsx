import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { Badge, Card, IconButton, Text } from "@/src/components/ui";
import { ProductAvatar } from "@/src/components/ProductAvatar";
import type { Product } from "@/src/types";
import { useTheme, type Tokens } from "@/src/theme";
import { fmtBRL } from "@/src/lib/domain/sales";

interface Props {
  product: Product;
  quantity: number;
  showControls: boolean;
  lowStockThreshold: number;
  tileWidth: number;
  onAdd: () => void;
  onRemove: () => void;
  onPressEditQuantity: () => void;
}

export function ProductSaleTile({
  product,
  quantity,
  showControls,
  lowStockThreshold,
  tileWidth,
  onAdd,
  onRemove,
  onPressEditQuantity,
}: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens, tileWidth), [tokens, tileWidth]);
  const empty = product.stock <= 0;
  const low = !empty && product.stock <= lowStockThreshold;
  const tone = empty ? "danger" : low ? "warning" : "default";
  const reachedStock = +quantity.toFixed(3) >= +product.stock.toFixed(3);

  return (
    <Card variant="flat" padding="none" tone={tone} style={styles.card}>
      <Pressable
        onPress={onPressEditQuantity}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${fmtBRL(product.price)} por ${product.unit}${quantity > 0 ? `, ${quantity} no pedido` : ""}. Toque para alterar quantidade`}
        style={styles.pressMain}
      >
        <View style={styles.avatarWrap}>
          <ProductAvatar name={product.name} photo={product.photo} size={Math.min(56, Math.floor(tileWidth * 0.42))} />
        </View>
        {quantity > 0 ? (
          <View style={styles.badgeWrap}>
            <Badge
              label={
                product.unit === "kg" ? String(+quantity.toFixed(3)).replace(".", ",") : String(quantity)
              }
              tone="primary"
            />
          </View>
        ) : null}
        <Text variant="caption" numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1} style={styles.price}>
          {fmtBRL(product.price)}/{product.unit}
        </Text>
        {empty ? (
          <Text variant="caption" tone="danger" numberOfLines={1} style={styles.stockHint}>
            Esgotado
          </Text>
        ) : low ? (
          <Text variant="caption" tone="warning" numberOfLines={1} style={styles.stockHint}>
            {product.stock}
            {product.unit}
          </Text>
        ) : null}
      </Pressable>
      {showControls ? (
        <View style={styles.controls}>
          <IconButton
            label={`Remover um ${product.name}`}
            tone="danger"
            size={40}
            icon={<Minus size={18} color={tokens.palette.danger} />}
            onPress={onRemove}
            disabled={quantity <= 0}
          />
          <IconButton
            label={`Adicionar um ${product.name}`}
            tone="success"
            size={40}
            icon={<Plus size={18} color={tokens.palette.success} />}
            onPress={onAdd}
            disabled={empty || reachedStock}
          />
        </View>
      ) : null}
    </Card>
  );
}

function makeStyles(t: Tokens, tileWidth: number) {
  return StyleSheet.create({
    card: {
      width: tileWidth,
      aspectRatio: 1,
      borderRadius: t.radius.md,
      overflow: "hidden",
    },
    pressMain: {
      flex: 1,
      paddingHorizontal: t.spacing.xs,
      paddingTop: t.spacing.sm,
      paddingBottom: t.spacing.xs,
      alignItems: "center",
      gap: 4,
    },
    avatarWrap: { alignItems: "center", justifyContent: "center" },
    badgeWrap: {
      position: "absolute",
      top: t.spacing.xs,
      right: t.spacing.xs,
    },
    name: { textAlign: "center", width: "100%" },
    price: { textAlign: "center" },
    stockHint: { textAlign: "center", fontSize: 10 },
    controls: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: t.spacing.xs,
      paddingBottom: t.spacing.xs,
    },
  });
}
