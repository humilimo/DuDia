import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheet, Button, Input, Text } from "@/src/components/ui";
import { store } from "@/src/lib/domain/store";
import { feedback } from "@/src/lib/utils/feedback";
import { useTheme, type Tokens } from "@/src/theme";

const CONFIRM_PHRASE = "ZERAR";

interface Props {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function ZeroStockSheet({ visible, onClose, onDone }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [text, setText] = useState("");

  const handleClose = () => {
    setText("");
    onClose();
  };

  const canSubmit = text.trim().toUpperCase() === CONFIRM_PHRASE;

  const submit = () => {
    if (!canSubmit) return;
    store.zeroAllProductStock();
    feedback("warn");
    setText("");
    onDone();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Zerar todo o estoque">
      <Text variant="body" tone="danger">
        Todas as quantidades em estoque serão definidas como zero. Os produtos cadastrados (nome, preço, fotos)
        permanecem.
      </Text>
      <Text variant="caption" tone="muted">
        Para confirmar, digite {CONFIRM_PHRASE} no campo abaixo.
      </Text>
      <Input
        label="Confirmação"
        placeholder={CONFIRM_PHRASE}
        value={text}
        onChangeText={setText}
        autoCapitalize="characters"
        accessibilityLabel="Digite ZERAR para confirmar"
      />
      <View style={styles.actions}>
        <Button label="Cancelar" variant="secondary" size="lg" onPress={handleClose} style={styles.half} />
        <Button
          label="Zerar estoque"
          variant="danger"
          size="lg"
          onPress={submit}
          disabled={!canSubmit}
          style={styles.half}
        />
      </View>
    </BottomSheet>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    actions: { flexDirection: "row", gap: t.spacing.sm },
    half: { flex: 1 },
  });
}
