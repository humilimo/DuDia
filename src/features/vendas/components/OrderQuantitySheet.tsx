import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { BottomSheet, Button, IconButton, Input, Text } from "@/src/components/ui";
import { fmtBRL } from "@/src/lib/domain/sales";
import type { Product } from "@/src/types";
import { useTheme, type Tokens } from "@/src/theme";

interface Props {
  visible: boolean;
  product: Product | null;
  currentQuantity: number;
  onClose: () => void;
  onApply: (quantity: number) => void;
}

function formatQtyForInput(product: Product, q: number): string {
  if (product.unit === "un") return String(Math.round(q));
  if (q <= 0) return "";
  return String(+q.toFixed(3)).replace(".", ",");
}

export function OrderQuantitySheet({
  visible,
  product,
  currentQuantity,
  onClose,
  onApply,
}: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible && product) {
      setText(formatQtyForInput(product, currentQuantity));
      setSubmitted(false);
    }
  }, [visible, product, currentQuantity]);

  const parsed = useMemo(() => {
    if (!product) return null;
    const raw = text.replace(",", ".").trim();
    if (raw === "") return 0;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return null;
    if (product.unit === "un") return Math.max(0, Math.floor(n));
    return +Math.max(0, n).toFixed(3);
  }, [text, product]);

  const apply = () => {
    if (!product) return;
    setSubmitted(true);
    if (parsed === null) return;
    onApply(parsed);
    onClose();
  };

  const numericBase = (): number => {
    if (parsed !== null) return parsed;
    return currentQuantity;
  };

  const stepDown = () => {
    if (!product) return;
    const cur = numericBase();
    if (product.unit === "un") {
      setText(formatQtyForInput(product, Math.max(0, cur - 1)));
    } else {
      const next = +Math.max(0, cur - 0.5).toFixed(3);
      setText(next > 0 ? String(next).replace(".", ",") : "");
    }
  };

  const stepUp = () => {
    if (!product) return;
    const cur = numericBase();
    const max = product.stock;
    if (product.unit === "un") {
      setText(formatQtyForInput(product, Math.min(max, cur + 1)));
    } else {
      const next = +Math.min(max, cur + 0.5).toFixed(3);
      setText(String(next).replace(".", ","));
    }
  };

  const parseError = submitted && parsed === null;

  return (
    <BottomSheet visible={visible && !!product} onClose={onClose} title={product?.name ?? ""}>
      {product ? (
        <>
          <Text variant="caption" tone="muted" style={styles.hint}>
            {fmtBRL(product.price)} · {product.stock}
            {product.unit} em estoque
          </Text>
          <View style={styles.stepRow}>
            <IconButton
              label="Diminuir quantidade"
              tone="danger"
              icon={<Minus size={22} color={tokens.palette.danger} />}
              onPress={stepDown}
            />
            <Input
              label="Quantidade no pedido"
              placeholder={product.unit === "un" ? "0" : "0,000"}
              keyboardType="decimal-pad"
              value={text}
              onChangeText={setText}
              containerStyle={styles.input}
              errorText={parseError ? "Informe um número válido" : undefined}
              accessibilityLabel="Quantidade no pedido"
            />
            <IconButton
              label="Aumentar quantidade"
              tone="success"
              icon={<Plus size={22} color={tokens.palette.success} />}
              onPress={stepUp}
            />
          </View>
          <Button label="Aplicar" variant="success" size="lg" fullWidth onPress={apply} />
        </>
      ) : null}
    </BottomSheet>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    hint: { marginBottom: t.spacing.sm },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: t.spacing.sm,
      marginBottom: t.spacing.md,
    },
    input: { flex: 1, marginBottom: 0 },
  });
}
