import { Link, Stack } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme, type Tokens } from "@/src/theme";
import { Text } from "@/src/components/ui";

export default function NotFoundScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <>
      <Stack.Screen options={{ title: "Página não encontrada" }} />
      <View style={styles.container}>
        <Text variant="title" style={styles.title}>
          Página não encontrada
        </Text>
        <Text variant="body" tone="muted" style={styles.desc}>
          O caminho que você abriu não existe no Dudia.
        </Text>
        <Link href="/" style={styles.link}>
          <Text variant="bodyStrong" tone="primary">
            Voltar para Vendas
          </Text>
        </Link>
      </View>
    </>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: t.spacing.xl,
      gap: t.spacing.md,
      backgroundColor: t.palette.background,
    },
    title: { textAlign: "center" },
    desc: { textAlign: "center" },
    link: { marginTop: t.spacing.md, paddingVertical: t.spacing.md },
  });
}
