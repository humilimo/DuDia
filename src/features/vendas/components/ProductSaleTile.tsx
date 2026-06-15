import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Badge, Card, IconButton, QuantityStepper, Text } from "@/src/components/ui";
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
  onClearQuantity?: () => void;
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
  onClearQuantity,
}: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const empty = product.stock <= 0;
  const low = !empty && product.stock <= lowStockThreshold;
  const tone = empty ? "danger" : low ? "warning" : "default";
  const reachedStock = +quantity.toFixed(3) >= +product.stock.toFixed(3);

  return (
    <Card variant="flat" padding="none" tone={tone} style={[styles.card, { width: tileWidth, minHeight: tileWidth }]}>
      {quantity > 0 && onClearQuantity ? (
        <View style={styles.trashWrap} pointerEvents="box-none">
          <IconButton
            label={`Remover todas as unidades de ${product.name}`}
            tone="danger"
            size={40}
            icon={<Trash2 size={18} color={tokens.palette.danger} />}
            onPress={onClearQuantity}
          />
        </View>
      ) : null}
      <View style={styles.body}>
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
              size={Math.min(40, Math.floor(tileWidth * 0.3))}
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
          <Text variant="caption" numberOfLines={1} style={styles.name}>
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
          <View style={styles.stepperBar}>
            <QuantityStepper
              onDecrement={onRemove}
              onIncrement={onAdd}
              decrementDisabled={quantity <= 0}
              incrementDisabled={empty || reachedStock}
              decrementAccessibilityLabel={`Remover um ${product.name}`}
              incrementAccessibilityLabel={`Adicionar um ${product.name}`}
              style={styles.stepperInner}
            />
          </View>
        ) : null}
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
    pressMain: {
      flex: 1,
      minHeight: 0,
      paddingBottom: 2,
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
    name: { textAlign: "center", width: "100%", flexShrink: 0 },
    price: { textAlign: "center", flexShrink: 0 },
    stockHint: { textAlign: "center", fontSize: 10, flexShrink: 0 },
    stepperBar: {
      flexShrink: 0,
      width: "100%",
      paddingTop: 2,
      alignItems: "stretch",
    },
    stepperInner: {
      maxWidth: "100%",
    },
    trashWrap: {
      position: "absolute",
      top: t.spacing.xs,
      right: t.spacing.xs,
      zIndex: 2,
    },
  });
}
