import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Bell,
  GraduationCap,
  Store,
  User,
  Vibrate,
  X,
} from "lucide-react-native";
import { useSettings, settingsStore } from "@/src/lib/settings";
import { useStore } from "@/src/lib/store";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors } from "@/src/theme";

const HELP_CARDS = {
  app: {
    title: "Como usar o Dudia",
    steps: [
      "Cadastre seus produtos com nome, preço, unidade e estoque inicial.",
      "Na aba Vendas, escolha Manual para tocar nos produtos ou Voz para segurar o microfone e falar o pedido.",
      "Confira o Valor Total, escolha a forma de pagamento e finalize a venda.",
      "O total do dia aparece no topo da tela e o estoque é atualizado automaticamente.",
      "Na aba Histórico, toque em um dia e depois em uma venda para ver os itens vendidos.",
    ],
  },
  vender: {
    title: "Como vender",
    steps: [
      "Entre na aba Vendas.",
      "No modo Manual, toque no botão de adicionar ao lado dos produtos.",
      "No modo Voz, segure o botão de microfone, fale os itens do pedido e solte ao terminar.",
      "Toque em Valor Total, vá para o pagamento e escolha Pix, Crédito ou Débito.",
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
      "Depois, use os botões de + e - na lista para ajustar o estoque.",
    ],
  },
  estoque: {
    title: "Como controlar estoque",
    steps: [
      "Cada produto mostra a quantidade disponível na lista.",
      "Use o botão + para adicionar uma unidade ao estoque.",
      "Use o botão - para remover uma unidade do estoque.",
      "Ao registrar uma venda, o estoque dos itens vendidos diminui automaticamente.",
      "Quando o estoque estiver baixo, o produto aparece destacado com aviso.",
    ],
  },
} as const;

type HelpKey = keyof typeof HELP_CARDS;

export function PerfilScreen() {
  const settings = useSettings();
  const { products, sales } = useStore();
  const [helpKey, setHelpKey] = useState<HelpKey | null>(null);
  const help = helpKey ? HELP_CARDS[helpKey] : null;

  function update<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    settingsStore.update({ [key]: value });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Perfil"
        subtitle={
          [settings.stallName, settings.ownerName].filter(Boolean).join(" · ") || "Minha banca"
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Identificação</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <User size={20} color={colors.mutedForeground} />
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Seu nome</Text>
              <TextInput
                value={settings.ownerName}
                onChangeText={(v) => update("ownerName", v)}
                placeholder="Ex: João"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.field}>
            <Store size={20} color={colors.mutedForeground} />
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Nome da banca</Text>
              <TextInput
                value={settings.stallName}
                onChangeText={(v) => update("stallName", v)}
                placeholder="Ex: Hortifruti do João"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Preferências</Text>
        <View style={styles.card}>
          <ToggleRow
            icon={<Vibrate size={20} color={colors.mutedForeground} />}
            label="Vibração"
            hint="Confirmação tátil"
            value={settings.vibration}
            onValueChange={(v) => update("vibration", v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={<Bell size={20} color={colors.mutedForeground} />}
            label="Notificações"
            hint="Alertas de estoque baixo e vendas"
            value={settings.notifications}
            onValueChange={(v) => update("notifications", v)}
          />
        </View>

        <Text style={styles.sectionTitle}>Aprender a usar</Text>
        <View style={styles.helpGrid}>
          {(
            [
              { key: "app", label: "Visão geral" },
              { key: "vender", label: "Vender" },
              { key: "cadastrar", label: "Cadastrar" },
              { key: "estoque", label: "Estoque" },
            ] as const
          ).map((t) => (
            <Pressable
              key={t.key}
              style={styles.helpBtn}
              onPress={() => setHelpKey(t.key)}
            >
              <GraduationCap size={16} color={colors.foreground} />
              <Text style={styles.helpBtnText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{products.length}</Text>
            <Text style={styles.statLabel}>Produtos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{sales.length}</Text>
            <Text style={styles.statLabel}>Vendas</Text>
          </View>
        </View>

        <Text style={styles.footer}>Dados salvos apenas neste aparelho.</Text>
      </ScrollView>

      <Modal visible={!!help} animationType="slide" onRequestClose={() => setHelpKey(null)}>
        {help && (
          <View style={styles.modal}>
            <ScreenHeader title={help.title}>
              <Pressable onPress={() => setHelpKey(null)} style={styles.closeHelp}>
                <X size={24} color={colors.primaryForeground} />
              </Pressable>
            </ScreenHeader>
            <ScrollView contentContainerStyle={styles.helpContent}>
              {help.steps.map((step, index) => (
                <View key={step} style={styles.helpStep}>
                  <Text style={styles.helpNum}>{index + 1}</Text>
                  <Text style={styles.helpText}>{step}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
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
  return (
    <View style={styles.toggleRow}>
      {icon}
      <View style={styles.fieldBody}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.fieldLabel}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.success, false: colors.muted }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 100, gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
    marginTop: 8,
    marginLeft: 8,
  },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 4 },
  field: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  fieldBody: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: colors.mutedForeground, textTransform: "uppercase" },
  input: { fontSize: 18, fontWeight: "600", color: colors.foreground, padding: 0 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  toggleLabel: { fontSize: 16, fontWeight: "600" },
  helpGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  helpBtn: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
  },
  helpBtnText: { fontWeight: "700", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statNum: { fontSize: 28, fontWeight: "900" },
  statLabel: { fontSize: 11, fontWeight: "600", color: colors.mutedForeground, textTransform: "uppercase" },
  footer: { textAlign: "center", fontSize: 12, color: colors.mutedForeground, marginTop: 16 },
  modal: { flex: 1, backgroundColor: colors.background },
  closeHelp: { alignSelf: "flex-end", padding: 8 },
  helpContent: { padding: 20, gap: 16 },
  helpStep: { flexDirection: "row", gap: 12 },
  helpNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 32,
    overflow: "hidden",
  },
  helpText: { flex: 1, fontSize: 16, fontWeight: "600", lineHeight: 22 },
});
