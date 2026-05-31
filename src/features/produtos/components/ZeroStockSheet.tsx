import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    if (visible) setText("");
  }, [visible]);

  const normalized = text.trim().toUpperCase();
  const canSubmit = normalized === CONFIRM_PHRASE;

  const submit = () => {
    if (!canSubmit) return;
    store.zeroAllProductStock();
    feedback("warn");
    onDone();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Zerar todo o estoque">
      <View style={styles.block}>
        <Text variant="body" tone="muted">
          Esta ação zera a quantidade em estoque de todos os produtos. Digite {CONFIRM_PHRASE} para confirmar.
        </Text>
        <Input
          value={text}
          onChangeText={setText}
          autoCapitalize="characters"
          accessibilityLabel="Digite ZERAR para confirmar"
          placeholder={CONFIRM_PHRASE}
        />
        <Button label="Zerar estoque" variant="danger" disabled={!canSubmit} onPress={submit} />
      </View>
    </BottomSheet>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    block: { gap: t.spacing.md },
  });
}
