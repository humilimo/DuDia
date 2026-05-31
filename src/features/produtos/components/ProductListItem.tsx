import { useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Minus, Plus, Trash2 } from "lucide-react-native";
import { Badge, Card, IconButton, Text } from "@/src/components/ui";
import { ProductAvatar } from "@/src/components/ProductAvatar";
import { store } from "@/src/lib/domain/store";
import { feedback } from "@/src/lib/utils/feedback";
import { fmtBRL } from "@/src/lib/domain/sales";
import { useTheme, type Tokens } from "@/src/theme";
import type { Product } from "@/src/types";

interface Props {
  product: Product;
  lowStockThreshold: number;
}

export function ProductListItem({ product, lowStockThreshold }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const empty = product.stock <= 0;
  const low = !empty && product.stock <= lowStockThreshold;
  const tone = empty ? "danger" : low ? "warning" : "default";

  const askDelete = () => {
    Alert.alert("Excluir produto", `Excluir ${product.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          store.removeProduct(product.id);
          feedback("warn");
        },
      },
    ]);
  };

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
      <IconButton
        label={`Diminuir estoque de ${product.name}`}
        tone="danger"
        icon={<Minus size={20} color={tokens.palette.danger} />}
        onPress={() => {
          store.adjustStock(product.id, -1);
          feedback("ok");
        }}
        disabled={empty}
      />
      <IconButton
        label={`Aumentar estoque de ${product.name}`}
        tone="success"
        icon={<Plus size={20} color={tokens.palette.success} />}
        onPress={() => {
          store.adjustStock(product.id, 1);
          feedback("ok");
        }}
      />
      <IconButton
        label={`Excluir ${product.name}`}
        tone="neutral"
        icon={<Trash2 size={18} color={tokens.palette.foregroundMuted} />}
        onPress={askDelete}
      />
    </Card>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
    info: { flex: 1, gap: 2 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.xs, flexWrap: "wrap" },
  });
}
