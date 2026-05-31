import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus } from "lucide-react-native";
import { BottomSheet, Button, Chip, Input, Text } from "@/src/components/ui";
import { useTheme, type Tokens } from "@/src/theme";
import { uriToResizedDataUrl } from "@/src/lib/utils/imageUtils";
import { store } from "@/src/lib/domain/store";
import { feedback } from "@/src/lib/utils/feedback";
import type { Product } from "@/src/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  editingProduct?: Product | null;
}

function stockToInput(p: Product): string {
  if (p.unit === "un") return String(Math.round(p.stock));
  const s = +p.stock.toFixed(3);
  return String(s).replace(".", ",");
}

function priceToInput(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

export function ProductForm({ visible, onClose, editingProduct = null }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<"kg" | "un">("kg");
  const [stock, setStock] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isEdit = editingProduct !== null;

  const reset = () => {
    setName("");
    setPrice("");
    setUnit("kg");
    setStock("");
    setPhoto(undefined);
    setPhotoError(null);
    setSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!visible) return;
    if (editingProduct) {
      setName(editingProduct.name);
      setPrice(priceToInput(editingProduct.price));
      setUnit(editingProduct.unit === "un" ? "un" : "kg");
      setStock(stockToInput(editingProduct));
      setPhoto(editingProduct.photo);
      setPhotoError(null);
      setSubmitted(false);
    } else {
      reset();
    }
  }, [visible, editingProduct]);

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
      setPhotoError(source === "camera" ? "Permissão da câmera negada." : "Permissão de fotos negada.");
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
    setSubmitted(true);
    const p = parseFloat(price.replace(",", "."));
    const s = parseFloat(stock.replace(",", ".")) || 0;
    if (!name.trim() || !p) return;
    if (editingProduct) {
      store.updateProduct(editingProduct.id, {
        name: name.trim(),
        price: p,
        unit,
        stock: unit === "un" ? Math.max(0, Math.round(s)) : +Math.max(0, s).toFixed(3),
        photo,
      });
    } else {
      store.addProduct({
        name: name.trim(),
        price: p,
        unit,
        stock: unit === "un" ? Math.max(0, Math.round(s)) : +Math.max(0, s).toFixed(3),
        photo,
      });
    }
    feedback("ok");
    handleClose();
  }

  function confirmDelete() {
    if (!editingProduct) return;
    Alert.alert(
      "Excluir produto",
      `Remover "${editingProduct.name}" do estoque? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir de vez",
          style: "destructive",
          onPress: () => {
            store.removeProduct(editingProduct.id);
            feedback("warn");
            handleClose();
          },
        },
      ],
    );
  }

  const nameError = submitted && !name.trim() ? "Informe um nome" : undefined;
  const priceError = submitted && !parseFloat(price.replace(",", ".")) ? "Informe o preço" : undefined;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={isEdit ? "Editar produto" : "Novo produto"}
    >
      <View style={styles.photoRow}>
        <Pressable
          style={styles.photoBtn}
          onPress={showPhotoOptions}
          accessibilityLabel="Adicionar foto do produto"
          accessibilityRole="button"
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoImg} />
          ) : (
            <Camera size={28} color={tokens.palette.foregroundMuted} />
          )}
        </Pressable>
        <View style={styles.photoBody}>
          <Text variant="bodyStrong">Foto do produto</Text>
          <Text variant="caption" tone="muted">
            Opcional
          </Text>
          {photoError ? (
            <Text variant="caption" tone="danger">
              {photoError}
            </Text>
          ) : null}
        </View>
        {photo ? (
          <Button label="Remover" variant="ghost" size="sm" onPress={() => setPhoto(undefined)} />
        ) : (
          <View style={styles.photoActions}>
            <Button
              label="Galeria"
              variant="secondary"
              size="sm"
              icon={<ImagePlus size={14} color={tokens.palette.primary} />}
              onPress={() => pickPhoto("library")}
            />
            <Button
              label="Câmera"
              variant="secondary"
              size="sm"
              icon={<Camera size={14} color={tokens.palette.primary} />}
              onPress={() => pickPhoto("camera")}
            />
          </View>
        )}
      </View>

      <Input
        label="Nome"
        placeholder="Ex: Couve-flor"
        value={name}
        onChangeText={setName}
        autoFocus={!isEdit}
        errorText={nameError}
      />

      <View style={styles.priceRow}>
        <Input
          label="Preço"
          placeholder="0,00"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
          containerStyle={styles.priceField}
          errorText={priceError}
          leadingIcon={
            <Text variant="bodyStrong" tone="muted">
              R$
            </Text>
          }
        />
        <View style={styles.unitWrap}>
          <Text variant="overline" tone="muted">
            Unidade
          </Text>
          <View style={styles.unitRow}>
            <Chip label="kg" selected={unit === "kg"} onPress={() => setUnit("kg")} />
            <Chip label="un" selected={unit === "un"} onPress={() => setUnit("un")} />
          </View>
        </View>
      </View>

      <Input
        label={isEdit ? "Quantidade em estoque" : "Estoque inicial"}
        placeholder="0"
        keyboardType="decimal-pad"
        value={stock}
        onChangeText={setStock}
        hint={isEdit ? "Valor atual na banca" : "Opcional"}
      />

      <Button
        label={isEdit ? "Salvar alterações" : "Salvar"}
        variant="success"
        size="lg"
        fullWidth
        onPress={submit}
      />

      {isEdit ? (
        <View style={styles.dangerZone}>
          <Text variant="overline" tone="danger" style={styles.dangerLabel}>
            Zona de perigo
          </Text>
          <Button
            label="Excluir produto do estoque"
            variant="danger"
            size="lg"
            fullWidth
            onPress={confirmDelete}
          />
        </View>
      ) : null}
    </BottomSheet>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    photoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
      padding: t.spacing.md,
      borderRadius: t.radius.md,
      backgroundColor: t.palette.surfaceMuted,
    },
    photoBtn: {
      width: 64,
      height: 64,
      borderRadius: t.radius.md,
      backgroundColor: t.palette.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    photoImg: { width: "100%", height: "100%" },
    photoBody: { flex: 1, gap: 2 },
    photoActions: { gap: 6 },
    priceRow: { flexDirection: "row", gap: t.spacing.md, alignItems: "flex-end" },
    priceField: { flex: 1 },
    unitWrap: { gap: 4 },
    unitRow: { flexDirection: "row", gap: t.spacing.xs },
    dangerZone: {
      marginTop: t.spacing.lg,
      paddingTop: t.spacing.md,
      gap: t.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: t.palette.border,
    },
    dangerLabel: { marginBottom: t.spacing.xs },
  });
}
