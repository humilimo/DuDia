import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { Badge, Card, Text } from "@/src/components/ui";
import { ProductAvatar } from "@/src/components/ProductAvatar";
import type { Product } from "@/src/types";
import { useTheme, type Tokens } from "@/src/theme";
import { fmtBRL } from "@/src/lib/domain/sales";

const STEP_COL_W = 30;
const STEP_HIT_H = 26;

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
      <View style={styles.body}>
        <View style={styles.avatarRow}>
          <ProductAvatar
            name={product.name}
            photo={product.photo}
            size={Math.min(44, Math.floor(tileWidth * 0.34))}
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
        <View style={styles.metaRow}>
          <Pressable
            onPress={onPressEditQuantity}
            accessibilityRole="button"
            accessibilityLabel={`${product.name}, ${fmtBRL(product.price)} por ${product.unit}${quantity > 0 ? `, ${quantity} no pedido` : ""}. Toque para alterar quantidade`}
            style={styles.metaTextCol}
          >
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
            <View style={styles.vStepper} accessibilityRole="toolbar">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover um ${product.name}`}
                style={({ pressed }) => [styles.stepHitV, pressed && styles.stepHitPressed]}
                onPress={onRemove}
                disabled={quantity <= 0}
                hitSlop={6}
              >
                <Minus size={15} color={tokens.palette.foregroundMuted} />
              </Pressable>
              <View style={styles.stepDividerH} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Adicionar um ${product.name}`}
                style={({ pressed }) => [styles.stepHitV, pressed && styles.stepHitPressed]}
                onPress={onAdd}
                disabled={empty || reachedStock}
                hitSlop={6}
              >
                <Plus size={15} color={tokens.palette.foregroundMuted} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
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
    body: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: t.spacing.xs,
      paddingTop: t.spacing.xs,
      paddingBottom: t.spacing.xs,
    },
    avatarRow: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
      position: "relative",
    },
    badgeWrap: {
      position: "absolute",
      top: -4,
      right: "18%",
    },
    metaRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "stretch",
      minHeight: 0,
      gap: 4,
    },
    metaTextCol: {
      flex: 1,
      minWidth: 0,
      justifyContent: "center",
      gap: 2,
    },
    name: { textAlign: "left", width: "100%" },
    price: { textAlign: "left" },
    stockHint: { textAlign: "left", fontSize: 10 },
    vStepper: {
      width: STEP_COL_W,
      flexShrink: 0,
      borderRadius: t.radius.md,
      backgroundColor: t.palette.surfaceMuted,
      overflow: "hidden",
      alignSelf: "stretch",
      justifyContent: "center",
    },
    stepHitV: {
      flex: 1,
      minHeight: STEP_HIT_H,
      alignItems: "center",
      justifyContent: "center",
    },
    stepHitPressed: {
      backgroundColor: t.palette.border,
    },
    stepDividerH: {
      height: 1,
      width: "70%",
      alignSelf: "center",
      backgroundColor: t.palette.borderStrong,
    },
  });
}
