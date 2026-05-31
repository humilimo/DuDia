import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Camera, ImagePlus, Mic, Minus, Plus, Trash2, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useStore, store } from "@/src/lib/store";
import { useSettings } from "@/src/lib/settings";
import { useSpeech } from "@/src/hooks/useSpeech";
import { applyProductsVoice, interpretCommands, type VoiceAction } from "@/src/lib/commands";
import { feedback } from "@/src/lib/feedback";
import { ProductAvatar } from "@/src/components/ProductAvatar";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { uriToResizedDataUrl } from "@/src/lib/imageUtils";
import type { Product } from "@/src/lib/types";
import { colors } from "@/src/theme";

export function ProdutosScreen() {
  const { products } = useStore();
  const settings = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [awaitingVoiceRegister, setAwaitingVoiceRegister] = useState(false);

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
      ),
    [products],
  );

  const { supported, listening, start, stop } = useSpeech({
    onResult: async (transcript) => {
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
      } catch {
        feedback("err");
      } finally {
        setAwaitingVoiceRegister(false);
        setProcessing(false);
      }
    },
    onError: () => {},
  });

  useEffect(() => () => {
    void stop();
  }, [stop]);

  function openCadastrarOptions() {
    Alert.alert("Cadastrar produto", "Escolha como deseja cadastrar:", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cadastro manual", onPress: () => setShowForm(true) },
      {
        text: "Cadastro por áudio",
        onPress: () => {
          setAwaitingVoiceRegister(true);
          void start();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Produtos"
        subtitle={`${products.length} cadastrados`}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {sortedProducts.length === 0 && (
          <Text style={styles.empty}>
            Nenhum produto. Toque <Text style={styles.bold}>Cadastrar</Text>.
          </Text>
        )}
        {sortedProducts.map((p) => {
          const low = p.stock > 0 && p.stock <= settings.lowStockThreshold;
          const empty = p.stock <= 0;
          return (
            <View
              key={p.id}
              style={[
                styles.row,
                empty && styles.rowEmpty,
                low && !empty && styles.rowLow,
              ]}
            >
              <View>
                <ProductAvatar name={p.name} photo={p.photo} size={56} />
                {(low || empty) && <Text style={styles.warn}>⚠</Text>}
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.meta}>
                  R$ {p.price.toFixed(2).replace(".", ",")}/{p.unit} ·{" "}
                  <Text style={empty ? styles.danger : low ? styles.warning : undefined}>
                    {p.stock}
                    {p.unit} {empty ? "sem estoque" : low ? "acabando" : "no estoque"}
                  </Text>
                </Text>
              </View>
              <Pressable
                style={styles.stockBtn}
                onPress={() => {
                  store.adjustStock(p.id, -1);
                  feedback("ok");
                }}
              >
                <Minus size={20} color={colors.danger} />
              </Pressable>
              <Pressable
                style={[styles.stockBtn, styles.stockBtnAdd]}
                onPress={() => {
                  store.adjustStock(p.id, 1);
                  feedback("ok");
                }}
              >
                <Plus size={20} color={colors.success} />
              </Pressable>
              <Pressable
                onPress={() => {
                  Alert.alert("Excluir", `Excluir ${p.name}?`, [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Excluir",
                      style: "destructive",
                      onPress: () => store.removeProduct(p.id),
                    },
                  ]);
                }}
              >
                <Trash2 size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cadastrarBtn} onPress={openCadastrarOptions}>
          <Plus size={20} color={colors.successForeground} />
          <Text style={styles.cadastrarText}>Cadastrar</Text>
        </Pressable>
        {supported && (
          <Pressable
            style={[styles.micBtn, listening && styles.micActive]}
            onPressIn={() => !processing && start()}
            onPressOut={() => stop()}
            disabled={processing}
          >
            <Mic size={24} color={listening ? colors.dangerForeground : colors.primary} />
          </Pressable>
        )}
      </View>

      {showForm && <ProductForm onClose={() => setShowForm(false)} />}
    </View>
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
    const lines = items.map(
      (item) => `Adicionar ${fmtVoiceQty(item.quantity, item.unit)} ${item.productName}`,
    );
    Alert.alert("Confirmar entrada no estoque", `${lines.join("\n")}?`, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Confirmar", onPress: () => resolve(true) },
    ]);
  });
}

function confirmVoiceRegister(action: VoiceAction): Promise<boolean> {
  return new Promise((resolve) => {
    const stock = action.product_stock && action.product_stock > 0 ? action.product_stock : 0;
    const stockLine =
      stock > 0 ? fmtVoiceQty(stock, action.product_unit || "kg") : "sem estoque inicial";
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

function fmtVoiceQty(quantity: number, unit: string) {
  if (unit === "un") return `${quantity} unidades`;
  return `${quantity}${unit}`;
}

function ProductForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<"kg" | "un">("kg");
  const [stock, setStock] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function setPhotoFromUri(uri: string) {
    setPhotoError(null);
    try {
      const dataUrl = await uriToResizedDataUrl(uri, 320);
      setPhoto(dataUrl);
    } catch {
      setPhotoError("Não foi possível ler a imagem.");
    }
  }

  async function pickPhoto(source: "library" | "camera") {
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPhotoError(
        source === "camera" ? "Permissão da câmera negada." : "Permissão de fotos negada.",
      );
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    await setPhotoFromUri(result.assets[0].uri);
  }

  function showPhotoOptions() {
    Alert.alert("Foto do produto", undefined, [
      { text: "Galeria", onPress: () => pickPhoto("library") },
      { text: "Tirar foto", onPress: () => pickPhoto("camera") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  function submit() {
    const p = parseFloat(price.replace(",", "."));
    const s = parseFloat(stock.replace(",", ".")) || 0;
    if (!name.trim() || !p) return;
    store.addProduct({ name: name.trim(), price: p, unit, stock: s, photo });
    feedback("ok");
    onClose();
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Novo produto</Text>
            <Pressable onPress={onClose}>
              <X size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={styles.photoRow}>
            <Pressable style={styles.photoBtn} onPress={showPhotoOptions}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoImg} />
              ) : (
                <Camera size={28} color={colors.mutedForeground} />
              )}
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.photoLabel}>Foto do produto</Text>
              <Text style={styles.photoHint}>Opcional</Text>
              {photoError && <Text style={styles.photoErr}>{photoError}</Text>}
            </View>
            {photo ? (
              <Pressable onPress={() => setPhoto(undefined)}>
                <Text style={styles.removePhoto}>Remover</Text>
              </Pressable>
            ) : (
              <View style={styles.photoActions}>
                <Pressable style={styles.addPhotoBtn} onPress={() => pickPhoto("library")}>
                  <ImagePlus size={16} color={colors.primary} />
                  <Text style={styles.addPhotoText}>Galeria</Text>
                </Pressable>
                <Pressable style={styles.addPhotoBtn} onPress={() => pickPhoto("camera")}>
                  <Camera size={16} color={colors.primary} />
                  <Text style={styles.addPhotoText}>Tirar foto</Text>
                </Pressable>
              </View>
            )}
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome (ex: Couve-flor)"
            style={styles.input}
            autoFocus
          />
          <View style={styles.priceRow}>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="Preço"
              keyboardType="decimal-pad"
              style={[styles.input, styles.flex]}
            />
            <View style={styles.unitToggle}>
              {(["kg", "un"] as const).map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TextInput
            value={stock}
            onChangeText={setStock}
            placeholder="Estoque inicial (opcional)"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Pressable style={styles.saveBtn} onPress={submit}>
            <Text style={styles.saveText}>Salvar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 8, paddingBottom: 120 },
  empty: {
    textAlign: "center",
    color: colors.mutedForeground,
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 16,
  },
  bold: { fontWeight: "700", color: colors.foreground },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 16,
  },
  rowEmpty: { backgroundColor: "rgba(220,74,58,0.1)" },
  rowLow: { backgroundColor: "rgba(232,160,32,0.15)" },
  warn: {
    position: "absolute",
    right: -4,
    top: -4,
    backgroundColor: colors.warning,
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    fontSize: 12,
    overflow: "hidden",
  },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700" },
  meta: { fontSize: 14, color: colors.mutedForeground },
  danger: { fontWeight: "700", color: colors.danger },
  warning: { fontWeight: "700", color: colors.warningForeground },
  stockBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220,74,58,0.1)",
  },
  stockBtnAdd: { backgroundColor: "rgba(34,168,90,0.15)" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  cadastrarBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 12,
  },
  cadastrarText: {
    color: colors.successForeground,
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
  },
  micBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  micActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  form: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  formTitle: { fontSize: 20, fontWeight: "700" },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },
  photoBtn: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: { width: "100%", height: "100%" },
  flex: { flex: 1 },
  photoLabel: { fontWeight: "700" },
  photoHint: { fontSize: 12, color: colors.mutedForeground },
  photoErr: { fontSize: 12, color: colors.danger, marginTop: 4 },
  removePhoto: { fontSize: 12, fontWeight: "700", color: colors.danger },
  photoActions: { gap: 8 },
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addPhotoText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "600",
    backgroundColor: colors.background,
  },
  priceRow: { flexDirection: "row", gap: 8 },
  unitToggle: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: 16, padding: 4 },
  unitBtn: { width: 56, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  unitBtnActive: { backgroundColor: colors.primary },
  unitText: { fontWeight: "700", color: colors.mutedForeground },
  unitTextActive: { color: colors.primaryForeground },
  saveBtn: {
    height: 56,
    backgroundColor: colors.success,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: colors.successForeground, fontSize: 18, fontWeight: "700" },
});
