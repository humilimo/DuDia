import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Package, Plus, Search } from "lucide-react-native";
import {
  Button,
  EmptyState,
  Input,
  ScreenContainer,
  ScreenHeader,
  useToast,
} from "@/src/components/ui";
import { useStore, store } from "@/src/lib/domain/store";
import { useSettings } from "@/src/lib/storage/settings";
import { useSpeech } from "@/src/hooks/useSpeech";
import { applyProductsVoice, interpretCommands, type VoiceAction } from "@/src/lib/voice/commands";
import { feedback } from "@/src/lib/utils/feedback";
import { fmtUnit } from "@/src/lib/domain/sales";
import { MicButton } from "@/src/features/vendas/components/MicButton";
import { useTheme, type Tokens } from "@/src/theme";
import type { Product } from "@/src/types";
import { ProductForm } from "../components/ProductForm";
import { ProductListItem } from "../components/ProductListItem";

export function ProdutosScreen() {
  const { products } = useStore();
  const settings = useSettings();
  const toast = useToast();
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [processing, setProcessing] = useState(false);
  const [awaitingVoiceRegister, setAwaitingVoiceRegister] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
      ),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedProducts;
    return sortedProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [sortedProducts, searchQuery]);

  const speech = useSpeech({
    onResult: async (transcript) => {
      if (!transcript.trim()) {
        setAwaitingVoiceRegister(false);
        setProcessing(false);
        return;
      }
      setProcessing(true);
      try {
        const actions = await interpretCommands(transcript, products, "produtos");
        if (awaitingVoiceRegister) {
          const register = actions.find((action) => action.action === "register_product");
          if (!register || !register.product_name || !register.product_price) {
            Alert.alert(
              "Cadastro por áudio",
              "Não entendi o cadastro. Tente: cadastrar tomate 6 reais 20 unidades.",
            );
            feedback("err");
            return;
          }
          const confirmed = await confirmVoiceRegister(register);
          if (!confirmed) {
            feedback("warn");
            return;
          }
          const result = applyProductsVoice(register);
          feedback(result.ok ? "ok" : "err");
          if (result.ok) toast.show(`Cadastrado: ${register.product_name}`, "success");
          return;
        }
        const preview = getVoiceStockPreview(actions, products);
        if (preview.length > 0) {
          const confirmed = await confirmVoiceAdditions(preview);
          if (!confirmed) {
            feedback("warn");
            return;
          }
        }
        let okCount = 0;
        for (const action of actions) {
          if (action.action === "unknown") continue;
          const result = applyProductsVoice(action);
          if (result.ok) okCount += 1;
        }
        feedback(okCount > 0 ? "ok" : "err");
        if (okCount > 0) toast.show("Estoque atualizado", "success");
      } catch {
        feedback("err");
      } finally {
        setAwaitingVoiceRegister(false);
        setProcessing(false);
      }
    },
    onError: (msg) => toast.show(msg, "danger"),
  });

  useEffect(() => () => {
    void speech.stop();
  }, [speech]);

  function openCadastrarOptions() {
    Alert.alert("Cadastrar produto", "Escolha como deseja cadastrar:", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cadastro manual", onPress: () => {
        setEditProduct(null);
        setShowForm(true);
      } },
      {
        text: "Cadastro por áudio",
        onPress: () => {
          setEditProduct(null);
          setAwaitingVoiceRegister(true);
          void speech.start();
        },
      },
    ]);
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Produtos"
        subtitle={`${products.length} ${products.length === 1 ? "cadastrado" : "cadastrados"}`}
      />

      <View style={styles.body}>
        {sortedProducts.length === 0 ? (
          <EmptyState
            icon={<Package size={32} color={tokens.palette.primary} />}
            title="Nenhum produto cadastrado"
            description="Toque em Cadastrar para adicionar o primeiro produto da sua banca."
            action={
              <Button
                label="Cadastrar agora"
                variant="success"
                size="lg"
                icon={<Plus size={20} color={tokens.palette.successForeground} />}
                onPress={openCadastrarOptions}
              />
            }
          />
        ) : (
          <View style={styles.listColumn}>
            <Input
              placeholder="Buscar produtos…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Buscar produtos"
              leadingIcon={<Search size={18} color={tokens.palette.foregroundMuted} />}
            />
            {filteredProducts.length === 0 ? (
              <EmptyState
                title="Nenhum produto encontrado"
                description="Tente outro nome na busca."
              />
            ) : (
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
              >
                {filteredProducts.map((p) => (
                  <ProductListItem
                    key={p.id}
                    product={p}
                    lowStockThreshold={settings.lowStockThreshold}
                    onEdit={(prod) => {
                      setShowForm(false);
                      setEditProduct(prod);
                    }}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label="Cadastrar"
          variant="success"
          size="lg"
          icon={<Plus size={20} color={tokens.palette.successForeground} />}
          onPress={openCadastrarOptions}
          style={styles.cadastrarBtn}
        />
        {speech.supported ? (
          <MicButton
            listening={speech.listening}
            processing={processing}
            durationMs={speech.recordingDurationMs}
            onStart={speech.start}
            onStop={speech.stop}
            onCancel={() => {
              setAwaitingVoiceRegister(false);
              void speech.cancel();
            }}
          />
        ) : null}
      </View>

      <ProductForm
        visible={showForm || editProduct !== null}
        onClose={() => {
          setShowForm(false);
          setEditProduct(null);
        }}
        editingProduct={editProduct}
      />
    </ScreenContainer>
  );
}

function getVoiceStockPreview(
  actions: VoiceAction[],
  products: Product[],
): { productName: string; quantity: number; unit: string }[] {
  return actions
    .filter((action) => action.action === "stock_add" || action.action === "sale_with_product")
    .map((action) => {
      const product =
        (action.product_id ? products.find((p) => p.id === action.product_id) : undefined) ??
        (action.product_name ? store.findProductByName(action.product_name) : undefined);
      if (!product) return null;
      const quantity =
        action.quantity ??
        (action.value && product.price > 0 ? +(action.value / product.price).toFixed(3) : 0);
      if (!quantity || quantity <= 0) return null;
      return { productName: product.name, quantity, unit: product.unit };
    })
    .filter((item): item is { productName: string; quantity: number; unit: string } => !!item);
}

function confirmVoiceAdditions(
  items: { productName: string; quantity: number; unit: string }[],
): Promise<boolean> {
  return new Promise((resolve) => {
    const lines = items.map((item) => `Adicionar ${fmtUnit(item.quantity, item.unit)} ${item.productName}`);
    Alert.alert("Confirmar entrada no estoque", `${lines.join("\n")}?`, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Confirmar", onPress: () => resolve(true) },
    ]);
  });
}

function confirmVoiceRegister(action: VoiceAction): Promise<boolean> {
  return new Promise((resolve) => {
    const stock = action.product_stock && action.product_stock > 0 ? action.product_stock : 0;
    const stockLine = stock > 0 ? fmtUnit(stock, action.product_unit || "kg") : "sem estoque inicial";
    Alert.alert(
      "Confirmar cadastro por áudio",
      `Produto: ${action.product_name}\nPreço: R$ ${action.product_price?.toFixed(2).replace(".", ",")}\nUnidade: ${action.product_unit || "kg"}\nEstoque inicial: ${stockLine}`,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: "Confirmar", onPress: () => resolve(true) },
      ],
    );
  });
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    body: { flex: 1, paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.md },
    listColumn: { flex: 1, gap: t.spacing.sm },
    list: { flex: 1 },
    listContent: { gap: t.spacing.sm, paddingBottom: t.spacing.xxxl },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.md,
    },
    cadastrarBtn: { flex: 1 },
  });
}
