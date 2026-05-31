import { useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, View } from "react-native";
import {
  Bell,
  LayoutGrid,
  LogOut,
  Moon,
  PackagePlus,
  ShoppingCart,
  Smartphone,
  Store,
  Sun,
  User,
  Vibrate,
  Warehouse,
} from "lucide-react-native";
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  Divider,
  Input,
  ScreenContainer,
  ScreenHeader,
  Text,
  useToast,
} from "@/src/components/ui";
import { useSettings, settingsStore } from "@/src/lib/storage/settings";
import { useStore, resetStoreData } from "@/src/lib/domain/store";
import { feedback } from "@/src/lib/utils/feedback";
import { useTheme, type Tokens } from "@/src/theme";

const HELP_CARDS = {
  app: {
    title: "Como usar o Dudia",
    steps: [
      "Cadastre seus produtos com nome, preço, unidade e estoque inicial.",
      "Na aba Vendas, use a busca e a grade de produtos: modo Manual para tocar e ajustar quantidades, ou modo Voz para segurar o microfone e falar o pedido.",
      "Confira o valor total, escolha a forma de pagamento e finalize a venda.",
      "O total do dia aparece no topo da tela e o estoque é atualizado automaticamente.",
      "Na aba Histórico, toque em um dia e depois em uma venda para ver os itens vendidos.",
    ],
  },
  vender: {
    title: "Como vender",
    steps: [
      "Entre na aba Vendas.",
      "No modo Manual, use a busca se quiser, toque nos produtos na grade e nos + e − ou abra a quantidade para digitar o valor.",
      "No modo Voz, segure o botão de microfone, fale os itens do pedido e solte ao terminar.",
      "Toque em Ver pedido, continue até o pagamento e escolha Pix, Crédito, Débito ou Dinheiro.",
      "A confirmação aparece no centro da tela e a venda entra no total do dia.",
    ],
  },
  cadastrar: {
    title: "Como cadastrar produtos",
    steps: [
      "Entre na aba Produtos.",
      "Toque em Cadastrar.",
      "Preencha o nome do produto, preço, unidade e estoque inicial.",
      "Toque em Salvar para adicionar o produto à lista.",
      "Para alterar nome, preço ou foto, toque no lápis; use + e − para ajuste rápido de estoque.",
    ],
  },
  estoque: {
    title: "Como controlar estoque",
    steps: [
      "Cada produto mostra a quantidade disponível na lista.",
      "Use o botão + para adicionar uma unidade ao estoque.",
      "Use o botão − para remover uma unidade do estoque.",
      "Toque no lápis para editar quantidade, preço, nome ou excluir o produto.",
      "Ao registrar uma venda, o estoque dos itens vendidos diminui automaticamente.",
      "Quando o estoque estiver baixo, o produto aparece destacado com aviso.",
    ],
  },
} as const;

type HelpKey = keyof typeof HELP_CARDS;

export function PerfilScreen() {
  const settings = useSettings();
  const { products, sales } = useStore();
  const { tokens, mode, setMode } = useTheme();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [helpKey, setHelpKey] = useState<HelpKey | null>(null);
  const help = helpKey ? HELP_CARDS[helpKey] : null;
  const lastTapRef = useRef(0);

  const helpTopicIcon = (key: HelpKey) => {
    const c = tokens.palette.foreground;
    switch (key) {
      case "app":
        return <LayoutGrid size={16} color={c} />;
      case "vender":
        return <ShoppingCart size={16} color={c} />;
      case "cadastrar":
        return <PackagePlus size={16} color={c} />;
      case "estoque":
        return <Warehouse size={16} color={c} />;
    }
  };

  function update<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    settingsStore.update({ [key]: value });
  }

  const handleReset = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 1200) {
      Alert.alert(
        "Apagar todos os dados?",
        "Isso vai remover todos os produtos e vendas deste aparelho. Não dá para desfazer.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Apagar tudo",
            style: "destructive",
            onPress: async () => {
              await resetStoreData();
              feedback("warn");
              toast.show("Dados apagados", "warning");
            },
          },
        ],
      );
    } else {
      toast.show("Toque duas vezes para confirmar", "warning");
    }
    lastTapRef.current = now;
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Perfil"
        subtitle={
          [settings.stallName, settings.ownerName].filter(Boolean).join(" · ") || "Minha banca"
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="overline" tone="muted" style={styles.section}>
          Identificação
        </Text>
        <Card variant="flat" padding="md" style={styles.card}>
          <Input
            label="Seu nome"
            placeholder="Ex: João"
            value={settings.ownerName}
            onChangeText={(v) => update("ownerName", v)}
            leadingIcon={<User size={18} color={tokens.palette.foregroundMuted} />}
          />
          <Input
            label="Nome da banca"
            placeholder="Ex: Hortifruti do João"
            value={settings.stallName}
            onChangeText={(v) => update("stallName", v)}
            leadingIcon={<Store size={18} color={tokens.palette.foregroundMuted} />}
          />
        </Card>

        <Text variant="overline" tone="muted" style={styles.section}>
          Aparência
        </Text>
        <Card variant="flat" padding="md" style={styles.card}>
          <Text variant="caption" tone="muted">
            Tema do aplicativo
          </Text>
          <View style={styles.themeRow}>
            <ThemeChip
              label="Sistema"
              icon={<Smartphone size={14} color={mode === "system" ? tokens.palette.primaryForeground : tokens.palette.foregroundMuted} />}
              selected={mode === "system"}
              onPress={() => setMode("system")}
            />
            <ThemeChip
              label="Claro"
              icon={<Sun size={14} color={mode === "light" ? tokens.palette.primaryForeground : tokens.palette.foregroundMuted} />}
              selected={mode === "light"}
              onPress={() => setMode("light")}
            />
            <ThemeChip
              label="Escuro"
              icon={<Moon size={14} color={mode === "dark" ? tokens.palette.primaryForeground : tokens.palette.foregroundMuted} />}
              selected={mode === "dark"}
              onPress={() => setMode("dark")}
            />
          </View>
        </Card>

        <Text variant="overline" tone="muted" style={styles.section}>
          Preferências
        </Text>
        <Card variant="flat" padding="none" style={styles.card}>
          <ToggleRow
            icon={<Vibrate size={20} color={tokens.palette.foregroundMuted} />}
            label="Vibração"
            hint="Confirmação tátil em cada ação"
            value={settings.vibration}
            onValueChange={(v) => update("vibration", v)}
          />
          <Divider />
          <ToggleRow
            icon={<Bell size={20} color={tokens.palette.foregroundMuted} />}
            label="Notificações"
            hint="Alertas de estoque baixo"
            value={settings.notifications}
            onValueChange={(v) => update("notifications", v)}
          />
        </Card>

        <Text variant="overline" tone="muted" style={styles.section}>
          Aprender a usar
        </Text>
        <View style={styles.helpGrid}>
          {([
            { key: "app", label: "Visão geral" },
            { key: "vender", label: "Vender" },
            { key: "cadastrar", label: "Cadastrar" },
            { key: "estoque", label: "Estoque" },
          ] as const).map((t) => (
            <Button
              key={t.key}
              label={t.label}
              variant="secondary"
              icon={helpTopicIcon(t.key)}
              onPress={() => setHelpKey(t.key)}
              style={styles.helpBtn}
            />
          ))}
        </View>

        <Text variant="overline" tone="muted" style={styles.section}>
          Resumo
        </Text>
        <View style={styles.statsRow}>
          <Card variant="flat" padding="md" style={styles.statCard}>
            <Text variant="title">{products.length}</Text>
            <Text variant="caption" tone="muted">
              Produtos
            </Text>
          </Card>
          <Card variant="flat" padding="md" style={styles.statCard}>
            <Text variant="title">{sales.length}</Text>
            <Text variant="caption" tone="muted">
              Vendas
            </Text>
          </Card>
        </View>

        <Text variant="overline" tone="muted" style={styles.section}>
          Zona de risco
        </Text>
        <Card variant="flat" tone="danger" padding="md" style={styles.card}>
          <Text variant="body" tone="danger">
            Apagar todos os dados deste aparelho. Toque duas vezes para confirmar.
          </Text>
          <Button
            label="Apagar tudo"
            variant="danger"
            icon={<LogOut size={18} color={tokens.palette.dangerForeground} />}
            onPress={handleReset}
          />
        </Card>

        <Text variant="caption" tone="subtle" style={styles.footer}>
          Dados salvos apenas neste aparelho.
        </Text>
      </ScrollView>

      <BottomSheet visible={!!help} onClose={() => setHelpKey(null)} title={help?.title}>
        {help ? (
          <View style={styles.helpList}>
            {help.steps.map((step, index) => (
              <View key={step} style={styles.helpStep}>
                <View style={styles.helpNum}>
                  <Text variant="bodyStrong" tone="primary">
                    {index + 1}
                  </Text>
                </View>
                <Text variant="body" style={styles.helpText}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </BottomSheet>
    </ScreenContainer>
  );
}

function ThemeChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return <Chip label={label} icon={icon} selected={selected} onPress={onPress} />;
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onValueChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  return (
    <View style={styles.toggleRow}>
      {icon}
      <View style={styles.flex}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ true: tokens.palette.success, false: tokens.palette.surfaceMuted }}
      />
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    content: { padding: t.spacing.lg, paddingBottom: t.spacing.huge, gap: t.spacing.xs },
    section: { marginTop: t.spacing.md, marginLeft: t.spacing.xs },
    card: { gap: t.spacing.sm },
    themeRow: { flexDirection: "row", gap: t.spacing.xs, flexWrap: "wrap" },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
      padding: t.spacing.lg,
    },
    flex: { flex: 1 },
    helpGrid: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm },
    helpBtn: { width: "48%", flexGrow: 1 },
    statsRow: { flexDirection: "row", gap: t.spacing.sm },
    statCard: { flex: 1, alignItems: "center" },
    footer: { textAlign: "center", marginTop: t.spacing.lg },
    helpList: { gap: t.spacing.md, paddingBottom: t.spacing.md },
    helpStep: { flexDirection: "row", gap: t.spacing.md, alignItems: "flex-start" },
    helpNum: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.palette.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    helpText: { flex: 1 },
  });
}
