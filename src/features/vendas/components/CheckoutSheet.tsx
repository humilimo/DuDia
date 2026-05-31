import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Banknote, Check, CreditCard, QrCode, ShoppingBasket } from "lucide-react-native";
import { BottomSheet, Button, Card, Chip, Input, Text } from "@/src/components/ui";
import { useTheme, type Tokens } from "@/src/theme";
import { PAYMENT_LABELS, fmtBRL } from "@/src/lib/domain/sales";
import type { PaymentMethod } from "@/src/types";

interface Props {
  visible: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
}

type Step = "summary" | "payment" | "cash";

export function CheckoutSheet({ visible, total, onClose, onConfirm }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [step, setStep] = useState<Step>("summary");
  const [cashInput, setCashInput] = useState("");

  const cashReceived = parseFloat(cashInput.replace(",", ".")) || 0;
  const change = cashReceived - total;
  const canConfirmCash = cashReceived >= total && cashReceived > 0;

  const reset = () => {
    setStep("summary");
    setCashInput("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const confirm = (method: PaymentMethod) => {
    reset();
    onConfirm(method);
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={styles.head}>
        <Text variant="overline" tone="muted">
          {step === "summary"
            ? "Resumo do pedido"
            : step === "payment"
              ? "Forma de pagamento"
              : "Pagamento em dinheiro"}
        </Text>
        <Text variant="display" style={styles.total}>
          {fmtBRL(total)}
        </Text>
      </View>

      {step === "summary" ? (
        <View style={styles.actions}>
          <Button
            label="Continuar"
            variant="success"
            size="lg"
            fullWidth
            icon={<CreditCard size={20} color={tokens.palette.successForeground} />}
            onPress={() => setStep("payment")}
          />
          <Button
            label="Adicionar mais produtos"
            variant="secondary"
            size="lg"
            fullWidth
            icon={<ShoppingBasket size={20} color={tokens.palette.foreground} />}
            onPress={handleClose}
          />
        </View>
      ) : step === "payment" ? (
        <View style={styles.actions}>
          <PayChip
            label={PAYMENT_LABELS.pix}
            icon={<QrCode size={20} color={tokens.palette.foreground} />}
            onPress={() => confirm("pix")}
          />
          <PayChip
            label={PAYMENT_LABELS.credito}
            icon={<CreditCard size={20} color={tokens.palette.foreground} />}
            onPress={() => confirm("credito")}
          />
          <PayChip
            label={PAYMENT_LABELS.debito}
            icon={<CreditCard size={20} color={tokens.palette.foreground} />}
            onPress={() => confirm("debito")}
          />
          <PayChip
            label={PAYMENT_LABELS.dinheiro}
            icon={<Banknote size={20} color={tokens.palette.foreground} />}
            onPress={() => setStep("cash")}
          />
          <Button label="Voltar" variant="ghost" onPress={() => setStep("summary")} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Input
            label="Valor recebido"
            placeholder="0,00"
            keyboardType="decimal-pad"
            value={cashInput}
            onChangeText={(v) => setCashInput(v.replace(/[^0-9.,]/g, ""))}
            autoFocus
            leadingIcon={
              <Text variant="bodyStrong" tone="muted">
                R$
              </Text>
            }
          />
          <Card
            variant="flat"
            tone={canConfirmCash ? "success" : cashInput ? "danger" : "default"}
            padding="md"
            style={styles.changeBox}
          >
            <Text variant="overline" tone="muted">
              {canConfirmCash
                ? "Troco"
                : cashInput
                  ? "Valor insuficiente"
                  : "Aguardando valor recebido"}
            </Text>
            <Text variant="display" tone={canConfirmCash ? "success" : "default"}>
              {canConfirmCash
                ? fmtBRL(change)
                : cashInput
                  ? fmtBRL(Math.max(0, total - cashReceived))
                  : fmtBRL(0)}
            </Text>
          </Card>
          <Button
            label="Confirmar pagamento"
            variant="success"
            size="lg"
            fullWidth
            disabled={!canConfirmCash}
            icon={<Check size={20} color={tokens.palette.successForeground} />}
            onPress={() => confirm("dinheiro")}
          />
          <Button
            label="Voltar"
            variant="ghost"
            onPress={() => setStep("payment")}
          />
        </View>
      )}
    </BottomSheet>
  );
}

function PayChip({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <Chip label={label} icon={icon} onPress={onPress} style={styles.payChip} />
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    head: { alignItems: "center", gap: 4 },
    total: { fontSize: 38 },
    actions: { gap: t.spacing.sm },
    payChip: {
      minHeight: 56,
      paddingHorizontal: t.spacing.lg,
      borderRadius: t.radius.md,
      backgroundColor: t.palette.surfaceMuted,
    },
    changeBox: { alignItems: "center", gap: t.spacing.xs },
  });
}
