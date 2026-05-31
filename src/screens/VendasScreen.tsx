import { BlurView } from "expo-blur";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  Check,
  CreditCard,
  Mic,
  Minus,
  Plus,
  QrCode,
  ShoppingBasket,
  X,
} from "lucide-react-native";
import { useStore, store, getTodayStats } from "@/src/lib/store";
import { useSpeech } from "@/src/hooks/useSpeech";
import { applyAction, interpretCommands, type VoiceAction } from "@/src/lib/commands";
import { feedback } from "@/src/lib/feedback";
import { pickTutorial, runTutorial, stopTutorial } from "@/src/lib/tutorial";
import { useSettings, type Settings } from "@/src/lib/settings";
import { storageGet, storageSet } from "@/src/lib/storage";
import { ProductAvatar } from "@/src/components/ProductAvatar";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import type { PaymentMethod, Product, SaleItem } from "@/src/lib/types";
import { colors } from "@/src/theme";

type InputMode = "voz" | "manual";
const INPUT_MODE_KEY = "feira:inputMode";
type Order = Record<string, number>;

type AddOrderResult =
  | { status: "added"; added: number }
  | { status: "partial"; added: number; requested: number }
  | { status: "none"; reason: "no_stock" | "full" };

type VoiceOrderResult = { ok: boolean; warning?: string };

const fmtPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const fmtDate = (d: Date) => {
  const raw = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(d);
  const [day, month] = raw.split(" de ");
  const monthTitle = month ? month.charAt(0).toUpperCase() + month.slice(1) : "";
  return `${day} de ${monthTitle}`;
};
const fmtDuration = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
};

function applyQuantityToOrder(
  order: Order,
  product: Product,
  requested: number,
): { next: Order; result: AddOrderResult } {
  const qty = Math.max(1, Math.round(requested));
  if (product.stock <= 0) {
    return { next: order, result: { status: "none", reason: "no_stock" } };
  }
  const inOrder = order[product.id] ?? 0;
  const room = product.stock - inOrder;
  if (room <= 0) {
    return { next: order, result: { status: "none", reason: "full" } };
  }
  const toAdd = Math.min(qty, room);
  const next = { ...order, [product.id]: inOrder + toAdd };
  if (toAdd < qty) {
    return { next, result: { status: "partial", added: toAdd, requested: qty } };
  }
  return { next, result: { status: "added", added: toAdd } };
}

function warningForAddResult(productName: string, result: AddOrderResult): string | undefined {
  if (result.status === "partial") {
    return `Unidades insuficientes para ${productName}: adicionado ${result.added} de ${result.requested}.`;
  }
  if (result.status === "none") {
    return `Sem unidades disponíveis para ${productName}.`;
  }
  return undefined;
}

export function VendasScreen() {
  const { products, sales } = useStore();
  const settings = useSettings();
  const { total, count } = getTodayStats(sales);

  const [inputMode, setInputMode] = useState<InputMode>("voz");
  const [processing, setProcessing] = useState(false);
  const [tutorial, setTutorial] = useState<{ idx: number; total: number; text: string } | null>(
    null,
  );
  const [confirmed, setConfirmed] = useState(false);
  const [order, setOrder] = useState<Order>({});

  useEffect(() => {
    if (!confirmed) return;
    const id = setTimeout(() => setConfirmed(false), 500);
    return () => clearTimeout(id);
  }, [confirmed]);

  useEffect(() => {
    void storageGet<InputMode | null>(INPUT_MODE_KEY, null).then((saved) => {
      if (saved === "voz" || saved === "manual") setInputMode(saved);
    });
  }, []);

  useEffect(() => {
    void storageSet(INPUT_MODE_KEY, inputMode);
  }, [inputMode]);

  useEffect(() => {
    setOrder((current) => {
      const productIds = new Set(products.map((p) => p.id));
      const next = Object.fromEntries(
        Object.entries(current).filter(([id, quantity]) => productIds.has(id) && quantity > 0),
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [products]);

  const { supported, listening, recordingDurationMs, start, stop, cancel } = useSpeech({
    onResult: async (transcript) => {
      const tut = pickTutorial(transcript);
      if (tut) {
        feedback("ok");
        runTutorial(tut, (idx, totalSteps, text) => {
          if (idx >= totalSteps) setTutorial(null);
          else setTutorial({ idx, total: totalSteps, text });
        });
        return;
      }
      setProcessing(true);
      try {
        const actions = await interpretCommands(transcript, products, "vendas");
        const warnings: string[] = [];
        let okCount = 0;
        let hasPartial = false;
        const saleLines: { product: Product; requested: number }[] = [];

        for (const action of actions) {
          if (action.action === "unknown") continue;
          if (action.action !== "sale_with_product") {
            const result = applyAction(action);
            if (result.ok) okCount += 1;
            continue;
          }
          const product = action.product_id
            ? products.find((p) => p.id === action.product_id)
            : action.product_name
              ? store.findProductByName(action.product_name)
              : undefined;
          if (!product) continue;
          const requested =
            action.quantity ??
            (action.value ? Math.max(1, Math.round(action.value / product.price)) : 1);
          saleLines.push({ product, requested });
        }

        if (saleLines.length > 0) {
          setOrder((current) => {
            let next = { ...current };
            for (const { product, requested } of saleLines) {
              const { next: updated, result } = applyQuantityToOrder(next, product, requested);
              next = updated;
              const warning = warningForAddResult(product.name, result);
              if (warning) warnings.push(warning);
              if (result.status === "added" || result.status === "partial") {
                okCount += 1;
                if (result.status === "partial") hasPartial = true;
              }
            }
            return next;
          });
        }

        if (warnings.length > 0) {
          Alert.alert("Estoque", warnings.join("\n"));
        }
        if (okCount > 0) feedback(hasPartial ? "warn" : "ok");
        else if (warnings.length === 0) feedback("err");
        else feedback("err");
      } catch {
        feedback("err");
      } finally {
        setProcessing(false);
      }
    },
    onError: () => {},
  });

  useEffect(() => () => {
    void stop();
  }, [stop]);

  function switchMode(mode: InputMode) {
    if (mode === inputMode) return;
    if (mode === "manual" && listening) void stop();
    setInputMode(mode);
  }

  function cancelOrder() {
    setOrder({});
    feedback("ok");
  }

  function addQuantityToOrder(
    product: Product,
    amount: number,
    opts?: { feedback?: boolean },
  ): boolean {
    let success = false;
    setOrder((current) => {
      const { next, result } = applyQuantityToOrder(current, product, amount);
      success = result.status === "added" || result.status === "partial";
      return next;
    });
    if (opts?.feedback !== false) {
      feedback(success ? "ok" : "err");
    }
    return success;
  }

  function handleVoiceOrder(action: VoiceAction, silent = false): VoiceOrderResult {
    if (action.action !== "sale_with_product") {
      const result = applyAction(action);
      if (!silent) feedback(result.kind);
      return { ok: result.ok };
    }
    const product = action.product_id
      ? products.find((p) => p.id === action.product_id)
      : action.product_name
        ? store.findProductByName(action.product_name)
        : undefined;
    if (!product) {
      if (!silent) feedback("err");
      return { ok: false };
    }
    const requested =
      action.quantity ??
      (action.value ? Math.max(1, Math.round(action.value / product.price)) : 1);
    let voiceResult: VoiceOrderResult = { ok: false };
    setOrder((current) => {
      const { next, result } = applyQuantityToOrder(current, product, requested);
      const warning = warningForAddResult(product.name, result);
      const ok = result.status === "added" || result.status === "partial";
      voiceResult = { ok, warning };
      return next;
    });
    if (!silent) {
      if (voiceResult.warning) {
        Alert.alert("Estoque", voiceResult.warning);
        feedback(voiceResult.ok ? "warn" : "err");
      } else {
        feedback(voiceResult.ok ? "ok" : "err");
      }
    }
    return voiceResult;
  }

  function removeFromOrder(productId: string) {
    setOrder((current) => {
      const quantity = current[productId] ?? 0;
      if (quantity <= 1) {
        const { [productId]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [productId]: quantity - 1 };
    });
    feedback("ok");
  }

  function registerManualSale(paymentMethod: PaymentMethod) {
    const items = products
      .map((product) => ({ product, quantity: order[product.id] ?? 0 }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) return;
    const unavailable = items.find((item) => item.quantity > item.product.stock);
    if (unavailable) {
      feedback("err");
      return;
    }
    const totalValue = +items
      .reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      .toFixed(2);
    const saleItems: SaleItem[] = items.map(({ product, quantity }) => ({
      productId: product.id,
      productName: product.name,
      quantity,
      unit: product.unit,
      price: product.price,
    }));
    const totalQty = saleItems.reduce((sum, item) => sum + item.quantity, 0);
    const label =
      saleItems.length === 1
        ? `+ ${fmtPrice(totalValue)} ${saleItems[0].productName}`
        : `+ ${fmtPrice(totalValue)} (${totalQty} ${totalQty === 1 ? "item" : "itens"})`;
    store.addSale({ value: totalValue, items: saleItems, paymentMethod, label });
    setOrder({});
    setConfirmed(true);
    feedback("ok");
  }

  const totalStr = fmtPrice(total);
  const todayLabel = fmtDate(new Date());
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= settings.lowStockThreshold);
  const isVoz = inputMode === "voz";
  const orderTotal = products.reduce(
    (sum, product) => sum + product.price * (order[product.id] ?? 0),
    0,
  );

  return (
    <View style={styles.screen}>
      {confirmed && (
        <View style={styles.confirmOverlay} pointerEvents="none">
          <View style={styles.confirmBox}>
            <Check size={80} color={colors.successForeground} strokeWidth={3.5} />
          </View>
        </View>
      )}

      <ScreenHeader
        title="Vendas"
        subtitle={`${todayLabel} · ${totalStr} · ${count} ${count === 1 ? "venda" : "vendas"}`}
      />

      {lowStock.length > 0 && (
        <View style={styles.lowStock}>
          <AlertTriangle size={20} color={colors.warning} />
          <Text style={styles.lowStockText}>
            Estoque acabando: {lowStock.map((p) => p.name).join(", ")}
          </Text>
        </View>
      )}

      <View style={styles.modeSwitcher}>
        <Pressable
          style={[styles.modeBtn, !isVoz && styles.modeBtnActive]}
          onPress={() => switchMode("manual")}
        >
          <Calculator size={16} color={!isVoz ? colors.primaryForeground : colors.mutedForeground} />
          <Text style={[styles.modeText, !isVoz && styles.modeTextActive]}>Manual</Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, isVoz && styles.modeBtnActive]}
          onPress={() => switchMode("voz")}
        >
          <Mic size={16} color={isVoz ? colors.primaryForeground : colors.mutedForeground} />
          <Text style={[styles.modeText, isVoz && styles.modeTextActive]}>Voz</Text>
        </Pressable>
      </View>

      {tutorial && (
        <View style={styles.tutorial}>
          <View style={styles.tutorialHeader}>
            <Text style={styles.tutorialMeta}>
              Tutorial · {tutorial.idx + 1}/{tutorial.total}
            </Text>
            <Pressable
              onPress={() => {
                stopTutorial();
                setTutorial(null);
              }}
            >
              <X size={16} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.tutorialText}>{tutorial.text}</Text>
        </View>
      )}

      <OrderPad
        products={products}
        settings={settings}
        order={order}
        total={orderTotal}
        mode={isVoz ? "voz" : "manual"}
        supported={supported}
        listening={listening}
        processing={processing}
        recordingDurationMs={recordingDurationMs}
        onCancel={cancelOrder}
        onAdd={(p) => addQuantityToOrder(p, 1)}
        onRemove={removeFromOrder}
        onRegister={registerManualSale}
        onMicDown={start}
        onMicUp={stop}
        onMicCancel={cancel}
      />
    </View>
  );
}

function OrderPad({
  products,
  settings,
  order,
  total,
  mode,
  supported = true,
  listening = false,
  processing = false,
  recordingDurationMs = 0,
  onCancel,
  onAdd,
  onRemove,
  onRegister,
  onMicDown,
  onMicUp,
  onMicCancel,
}: {
  products: Product[];
  settings: Settings;
  order: Order;
  total: number;
  mode: InputMode;
  supported?: boolean;
  listening?: boolean;
  processing?: boolean;
  recordingDurationMs?: number;
  onCancel: () => void;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  onRegister: (paymentMethod: PaymentMethod) => void;
  onMicDown: () => void;
  onMicUp: () => void;
  onMicCancel: () => void;
}) {
  const hasItems = total > 0;
  const isVoice = mode === "voz";
  const [showCheckout, setShowCheckout] = useState(false);
  const [isCancellingMic, setIsCancellingMic] = useState(false);
  const micPulse = useRef(new Animated.Value(1)).current;

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
      ),
    [products],
  );

  useEffect(() => {
    if (!hasItems && showCheckout) setShowCheckout(false);
  }, [hasItems, showCheckout]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (processing) return;
          setIsCancellingMic(false);
          onMicDown();
        },
        onPanResponderMove: (_evt, gesture) => {
          if (processing) return;
          setIsCancellingMic(gesture.dy < -70);
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (processing) return;
          if (isCancellingMic || gesture.dy < -70) onMicCancel();
          else onMicUp();
          setIsCancellingMic(false);
        },
        onPanResponderTerminate: () => {
          if (!processing) onMicCancel();
          setIsCancellingMic(false);
        },
      }),
    [processing, onMicDown, onMicUp, onMicCancel, isCancellingMic],
  );

  useEffect(() => {
    if (listening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, {
            toValue: 1.08,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(micPulse, {
            toValue: 1,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    micPulse.setValue(1);
  }, [listening, micPulse]);

  if (products.length === 0) {
    return (
      <Text style={styles.emptyPad}>
        Cadastre produtos na aba Produtos para registrar vendas.
      </Text>
    );
  }

  return (
    <View style={styles.pad}>
      <View style={styles.padHeader}>
        <Text style={styles.padTitle}>Pedido</Text>
        <Pressable style={styles.clearBtn} onPress={onCancel}>
          <X size={14} color={colors.mutedForeground} />
          <Text style={styles.clearText}>Limpar</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.productList} contentContainerStyle={styles.productListContent}>
        {sortedProducts.map((p) => {
          const low = p.stock > 0 && p.stock <= settings.lowStockThreshold;
          const empty = p.stock <= 0;
          const quantity = order[p.id] ?? 0;
          return (
            <View
              key={p.id}
              style={[styles.productRow, empty && styles.rowEmpty, low && !empty && styles.rowLow]}
            >
              <ProductAvatar name={p.name} photo={p.photo} size={56} />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.productMeta}>
                  {fmtPrice(p.price)}/{p.unit} ·{" "}
                  <Text style={empty ? styles.danger : low ? styles.warning : undefined}>
                    {p.stock}
                    {p.unit} {empty ? "sem estoque" : low ? "acabando" : "no estoque"}
                  </Text>
                </Text>
              </View>
              {!isVoice && quantity > 0 && (
                <Pressable style={styles.removeBtn} onPress={() => onRemove(p.id)}>
                  <Minus size={20} color={colors.danger} />
                </Pressable>
              )}
              {quantity > 0 && <Text style={styles.qtyBadge}>{quantity}</Text>}
              {!isVoice && (
                <Pressable
                  style={[styles.addBtn, (empty || quantity >= p.stock) && styles.disabled]}
                  onPress={() => onAdd(p)}
                  disabled={empty || quantity >= p.stock}
                >
                  <Plus size={20} color={colors.success} />
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      {(hasItems || (isVoice && supported)) && (
        <View
          style={[
            styles.checkoutBar,
            isVoice && styles.checkoutBarVoice,
            isVoice && !hasItems && styles.checkoutBarMicOnly,
          ]}
        >
          {hasItems && (
            <Pressable
              style={[styles.sellBtn, isVoice && styles.sellBtnVoice]}
              onPress={() => setShowCheckout(true)}
            >
              <Text style={styles.sellLabel}>Vender</Text>
              <Text style={styles.sellTotal}>{fmtPrice(total)}</Text>
            </Pressable>
          )}
          {isVoice && supported && (
            <View style={styles.micWrap}>
              {listening && (
                <View style={[styles.cancelTarget, isCancellingMic && styles.cancelTargetActive]}>
                  <X size={16} color={isCancellingMic ? colors.dangerForeground : colors.danger} />
                  <Text
                    style={[
                      styles.cancelTargetText,
                      isCancellingMic && styles.cancelTargetTextActive,
                    ]}
                  >
                    Arraste para cancelar
                  </Text>
                </View>
              )}
              {listening && <Text style={styles.micDuration}>{fmtDuration(recordingDurationMs)}</Text>}
              <Animated.View style={{ transform: [{ scale: micPulse }] }}>
                <BlurView intensity={40} tint="light" style={styles.micBlur}>
                  <Pressable
                    style={[styles.micBtn, listening && styles.micActive]}
                    {...panResponder.panHandlers}
                    disabled={processing}
                  >
                    <Mic size={24} color={listening ? colors.dangerForeground : colors.primaryForeground} />
                  </Pressable>
                </BlurView>
              </Animated.View>
            </View>
          )}
        </View>
      )}

      {showCheckout && (
        <CheckoutSheet
          total={total}
          onClose={() => setShowCheckout(false)}
          onConfirm={(method) => {
            setShowCheckout(false);
            onRegister(method);
          }}
        />
      )}
    </View>
  );
}

function CheckoutSheet({
  total,
  onClose,
  onConfirm,
}: {
  total: number;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod) => void;
}) {
  const [step, setStep] = useState<"summary" | "payment" | "cash">("summary");
  const [cashInput, setCashInput] = useState("");

  const cashReceived = parseFloat(cashInput.replace(",", ".")) || 0;
  const change = cashReceived - total;
  const canConfirmCash = cashReceived >= total && cashReceived > 0;

  const headerLabel =
    step === "summary"
      ? "Total do pedido"
      : step === "payment"
        ? "Forma de pagamento"
        : "Pagamento em dinheiro";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetLabel}>{headerLabel}</Text>
          <Text style={styles.sheetTotal}>{fmtPrice(total)}</Text>

          {step === "summary" ? (
            <>
              <Pressable style={styles.primaryAction} onPress={() => setStep("payment")}>
                <CreditCard size={20} color={colors.successForeground} />
                <Text style={styles.primaryActionText}>Ir para o pagamento</Text>
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={onClose}>
                <ShoppingBasket size={20} color={colors.foreground} />
                <Text style={styles.secondaryActionText}>Adicionar mais itens</Text>
              </Pressable>
            </>
          ) : step === "cash" ? (
            <>
              <Text style={styles.inputLabel}>Valor recebido</Text>
              <View style={styles.cashInputRow}>
                <Text style={styles.currency}>R$</Text>
                <TextInput
                  autoFocus
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  value={cashInput}
                  onChangeText={(v) => setCashInput(v.replace(/[^0-9.,]/g, ""))}
                  style={styles.cashInput}
                />
              </View>
              <View
                style={[
                  styles.changeBox,
                  canConfirmCash && styles.changeOk,
                  cashInput && !canConfirmCash && styles.changeErr,
                ]}
              >
                <Text style={styles.changeLabel}>
                  {canConfirmCash
                    ? "Troco"
                    : cashInput
                      ? "Valor insuficiente"
                      : "Aguardando valor recebido"}
                </Text>
                <Text style={styles.changeValue}>
                  {canConfirmCash
                    ? fmtPrice(change)
                    : cashInput
                      ? fmtPrice(total - cashReceived)
                      : fmtPrice(0)}
                </Text>
              </View>
              <Pressable
                style={[styles.primaryAction, !canConfirmCash && styles.disabledAction]}
                onPress={() => canConfirmCash && onConfirm("dinheiro")}
                disabled={!canConfirmCash}
              >
                <Check size={20} color={colors.successForeground} />
                <Text style={styles.primaryActionText}>Confirmar pagamento</Text>
              </Pressable>
              <Pressable style={styles.backAction} onPress={() => setStep("payment")}>
                <Text style={styles.backActionText}>Voltar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={[styles.payBtn, styles.payBtnPix]} onPress={() => onConfirm("pix")}>
                <QrCode size={20} color="#000" />
                <Text style={styles.payBtnTextDark}>Pix</Text>
              </Pressable>
              <Pressable style={[styles.payBtnOutline, styles.payBtnCredito]} onPress={() => onConfirm("credito")}>
                <CreditCard size={20} color="#000" />
                <Text style={styles.payBtnTextDark}>Crédito</Text>
              </Pressable>
              <Pressable style={[styles.payBtnOutline, styles.payBtnDebito]} onPress={() => onConfirm("debito")}>
                <CreditCard size={20} color="#000" />
                <Text style={styles.payBtnTextDark}>Débito</Text>
              </Pressable>
              <Pressable style={[styles.payBtnOutline, styles.payBtnDinheiro]} onPress={() => setStep("cash")}>
                <Banknote size={20} color="#000" />
                <Text style={styles.payBtnTextDark}>Dinheiro</Text>
              </Pressable>
              <Pressable style={styles.backAction} onPress={() => setStep("summary")}>
                <Text style={styles.backActionText}>Voltar</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  confirmOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBox: {
    width: 128,
    height: 128,
    borderRadius: 24,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  lowStock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.warning,
    backgroundColor: "rgba(232,160,32,0.15)",
  },
  lowStockText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.warningForeground },
  modeSwitcher: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.muted,
    borderRadius: 999,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 999,
  },
  modeBtnActive: { backgroundColor: colors.primary },
  modeText: { fontWeight: "700", color: colors.mutedForeground },
  modeTextActive: { color: colors.primaryForeground },
  tutorial: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    padding: 20,
  },
  tutorialHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  tutorialMeta: { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  tutorialText: { fontSize: 18, fontWeight: "600", color: colors.primary },
  emptyPad: {
    margin: 16,
    padding: 24,
    textAlign: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  pad: { flex: 1 },
  padHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  padTitle: {
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clearText: { fontSize: 12, fontWeight: "700", color: colors.mutedForeground },
  productList: { flex: 1 },
  productListContent: { padding: 16, gap: 8, paddingBottom: 220 },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 16,
  },
  rowEmpty: { backgroundColor: "rgba(220,74,58,0.1)" },
  rowLow: { backgroundColor: "rgba(232,160,32,0.15)" },
  productInfo: { flex: 1 },
  productName: { fontSize: 18, fontWeight: "700" },
  productMeta: { fontSize: 14, color: colors.mutedForeground },
  danger: { fontWeight: "700", color: colors.danger },
  warning: { fontWeight: "700", color: colors.warningForeground },
  removeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220,74,58,0.1)",
  },
  qtyBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontWeight: "900",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 44,
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34,168,90,0.15)",
  },
  disabled: { opacity: 0.4 },
  checkoutBar: {
    position: "absolute",
    bottom: 64,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "transparent",
  },
  checkoutBarVoice: { backgroundColor: "transparent" },
  checkoutBarMicOnly: { justifyContent: "flex-end" },
  sellBtn: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 16,
    minHeight: 84,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sellBtnVoice: { flex: 1 },
  sellLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    color: colors.successForeground,
  },
  sellTotal: { fontSize: 30, fontWeight: "900", color: colors.successForeground },
  micWrap: { alignItems: "center", justifyContent: "center", gap: 4 },
  cancelTarget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(220,74,58,0.12)",
    borderWidth: 1,
    borderColor: "rgba(220,74,58,0.3)",
  },
  cancelTargetActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  cancelTargetText: { fontSize: 11, fontWeight: "700", color: colors.danger },
  cancelTargetTextActive: { color: colors.dangerForeground },
  micDuration: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  micBlur: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
  },
  micBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  micActive: { backgroundColor: colors.danger },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    gap: 12,
  },
  sheetLabel: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  sheetTotal: { textAlign: "center", fontSize: 36, fontWeight: "900" },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 16,
  },
  primaryActionText: {
    color: colors.successForeground,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.muted,
    padding: 16,
    borderRadius: 16,
  },
  secondaryActionText: { fontWeight: "700" },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  cashInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currency: { fontSize: 18, fontWeight: "900", color: colors.mutedForeground },
  cashInput: { flex: 1, fontSize: 24, fontWeight: "900" },
  changeBox: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    backgroundColor: colors.muted,
  },
  changeOk: { backgroundColor: "rgba(34,168,90,0.1)" },
  changeErr: { backgroundColor: "rgba(220,74,58,0.1)" },
  changeLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  changeValue: { fontSize: 28, fontWeight: "900", marginTop: 4 },
  disabledAction: { backgroundColor: colors.muted },
  backAction: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(220,74,58,0.1)",
    borderRadius: 16,
  },
  backActionText: { fontWeight: "700", color: colors.danger },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.primarySoft,
    padding: 16,
    borderRadius: 16,
  },
  payBtnPix: { backgroundColor: "#8df3d5" },
  payBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payBtnCredito: { backgroundColor: "#cde6ff", borderColor: "#9cc8ff" },
  payBtnDebito: { backgroundColor: "#ffe8b5", borderColor: "#ffd174" },
  payBtnDinheiro: { backgroundColor: "#d3f7d8", borderColor: "#9fe6aa" },
  payBtnText: { fontWeight: "900", color: colors.primary, fontSize: 16 },
  payBtnTextDark: { fontWeight: "900", fontSize: 16, color: "#000" },
});
