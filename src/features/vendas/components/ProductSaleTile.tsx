import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { Badge, Card, Text } from "@/src/components/ui";
import { ProductAvatar } from "@/src/components/ProductAvatar";
import type { Product } from "@/src/types";
import { useTheme, type Tokens } from "@/src/theme";
import { fmtBRL } from "@/src/lib/domain/sales";

const STEP_ROW_H = 32;

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
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const empty = product.stock <= 0;
  const low = !empty && product.stock <= lowStockThreshold;
  const tone = empty ? "danger" : low ? "warning" : "default";
  const reachedStock = +quantity.toFixed(3) >= +product.stock.toFixed(3);
  const tileH = tileWidth;

  return (
    <Card variant="flat" padding="none" tone={tone} style={[styles.card, { width: tileWidth, height: tileH }]}>
      <Pressable
        onPress={onPressEditQuantity}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${fmtBRL(product.price)} por ${product.unit}${quantity > 0 ? `, ${quantity} no pedido` : ""}. Toque para alterar quantidade`}
        style={styles.pressMain}
      >
        <View style={styles.avatarWrap}>
          <ProductAvatar
            name={product.name}
            photo={product.photo}
            size={Math.min(48, Math.floor(tileWidth * 0.36))}
          />
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
        </View>
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
        <View style={styles.stepper} accessibilityRole="toolbar">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remover um ${product.name}`}
            style={({ pressed }) => [styles.stepHit, pressed && styles.stepHitPressed]}
            onPress={onRemove}
            disabled={quantity <= 0}
            hitSlop={8}
          >
            <Minus size={16} color={tokens.palette.foregroundMuted} />
          </Pressable>
          <View style={styles.stepDivider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Adicionar um ${product.name}`}
            style={({ pressed }) => [styles.stepHit, pressed && styles.stepHitPressed]}
            onPress={onAdd}
            disabled={empty || reachedStock}
            hitSlop={8}
          >
            <Plus size={16} color={tokens.palette.foregroundMuted} />
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    card: {
      borderRadius: t.radius.md,
      overflow: "hidden",
      flexDirection: "column",
    },
    pressMain: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: t.spacing.xs,
      paddingTop: t.spacing.xs,
      paddingBottom: 4,
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 2,
    },
    avatarWrap: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 2,
      position: "relative",
    },
    badgeWrap: {
      position: "absolute",
      top: -4,
      right: -4,
    },
    name: { textAlign: "center", width: "100%" },
    price: { textAlign: "center" },
    stockHint: { textAlign: "center", fontSize: 10 },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      height: STEP_ROW_H,
      marginBottom: t.spacing.xs,
      marginHorizontal: t.spacing.xs,
      borderRadius: t.radius.pill,
      backgroundColor: t.palette.surfaceMuted,
      overflow: "hidden",
    },
    stepHit: {
      flex: 1,
      height: STEP_ROW_H,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 34,
    },
    stepHitPressed: {
      backgroundColor: t.palette.border,
    },
    stepDivider: {
      width: 1,
      height: 18,
      backgroundColor: t.palette.borderStrong,
    },
  });
}
