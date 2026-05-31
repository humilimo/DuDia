import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { X } from "lucide-react-native";
import { Card, IconButton, Text } from "@/src/components/ui";
import { useTheme, type Tokens } from "@/src/theme";

interface Props {
  idx: number;
  total: number;
  text: string;
  onClose: () => void;
}

export function VoiceTutorial({ idx, total, text, onClose }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <Card tone="primary" padding="md" style={styles.card}>
      <View style={styles.header}>
        <Text variant="overline" tone="primary">
          Tutorial · {idx + 1}/{total}
        </Text>
        <IconButton
          label="Encerrar tutorial"
          icon={<X size={16} color={tokens.palette.primary} />}
          tone="primary"
          size={40}
          onPress={onClose}
        />
      </View>
      <Text variant="bodyStrong" tone="primary">
        {text}
      </Text>
    </Card>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    card: { gap: t.spacing.sm },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  });
}
