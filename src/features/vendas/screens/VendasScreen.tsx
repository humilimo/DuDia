import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { Calculator, Check, Mic, Search } from "lucide-react-native";
import {
  EmptyState,
  Input,
  ScreenContainer,
  ScreenHeader,
  SegmentedControl,
  useToast,
} from "@/src/components/ui";
import { useStore, store } from "@/src/lib/domain/store";
import { fmtBRL, getTodayStats } from "@/src/lib/domain/sales";
import { useSpeech } from "@/src/hooks/useSpeech";
import { applyAction, interpretCommands } from "@/src/lib/voice/commands";
import { feedback } from "@/src/lib/utils/feedback";
import { pickTutorial, runTutorial, stopTutorial } from "@/src/lib/voice/tutorial";
import { useSettings } from "@/src/lib/storage/settings";
import { storageGet, storageSet } from "@/src/lib/storage/storage";
import type { PaymentMethod, Product, SaleItem } from "@/src/types";
import { useTheme, type Tokens } from "@/src/theme";
import { useOrder } from "../hooks/useOrder";
import { CartBar } from "../components/CartBar";
import { OrderQuantitySheet } from "../components/OrderQuantitySheet";
import { ProductSaleTile } from "../components/ProductSaleTile";
import { CheckoutSheet } from "../components/CheckoutSheet";
import { LowStockBanner } from "../components/LowStockBanner";
import { VoiceTutorial } from "../components/VoiceTutorial";
import { MicButton } from "../components/MicButton";

type InputMode = "voz" | "manual";
const INPUT_MODE_KEY = "feira:inputMode";

const fmtDate = (d: Date) => {
  const raw = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(d);
  const [day, month] = raw.split(" de ");
  const monthTitle = month ? month.charAt(0).toUpperCase() + month.slice(1) : "";
  return `${day} de ${monthTitle}`;
};

export function VendasScreen() {
  const { products, sales } = useStore();
  const settings = useSettings();
  const toast = useToast();
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const stats = useMemo(() => getTodayStats(sales), [sales]);

  const [inputMode, setInputMode] = useState<InputMode>("voz");
  const [processing, setProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [tutorial, setTutorial] = useState<{ idx: number; total: number; text: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [qtySheetProduct, setQtySheetProduct] = useState<Product | null>(null);

  const { width: windowWidth } = useWindowDimensions();
  const cart = useOrder(products);

  useEffect(() => {
    if (!confirmed) return;
    const id = setTimeout(() => setConfirmed(false), 600);
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
    if (!cart.hasItems && showCheckout) setShowCheckout(false);
  }, [cart.hasItems, showCheckout]);

  const speech = useSpeech({
    onResult: async (transcript) => {
      if (!transcript.trim()) {
        setProcessing(false);
        return;
      }
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
        const saleLines: { product: Product; requested: number }[] = [];
        let okCount = 0;

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
            (action.value
              ? product.unit === "un"
                ? Math.max(1, Math.round(action.value / product.price))
                : Math.max(0.001, +(action.value / product.price).toFixed(3))
              : 1);
          saleLines.push({ product, requested });
        }

        let warnings: string[] = [];
        let hasPartial = false;
        if (saleLines.length > 0) {
          const outcome = cart.applyMany(saleLines);
          warnings = outcome.warnings;
          hasPartial = outcome.hasPartial;
          okCount += outcome.addedCount;
        }

        if (warnings.length > 0) {
          toast.show(warnings[0], hasPartial ? "warning" : "danger");
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
    onError: (msg) => toast.show(msg, "danger"),
  });

  useEffect(() => () => {
    void speech.stop();
  }, [speech]);

  const switchMode = (mode: InputMode) => {
    if (mode === inputMode) return;
    if (mode === "manual" && speech.listening) speech.stop();
    setInputMode(mode);
  };

  const lowStock = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= settings.lowStockThreshold),
    [products, settings.lowStockThreshold],
  );

  const isVoice = inputMode === "voz";
  const todayLabel = fmtDate(new Date());
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedProducts;
    return sortedProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [sortedProducts, searchQuery]);

  const gridMetrics = useMemo(() => {
    const horizontalPad = tokens.spacing.lg * 2;
    const innerWidth = windowWidth - horizontalPad;
    const gap = tokens.spacing.sm;
    const tileWidth = (innerWidth - gap * 2) / 3;
    return { gap, tileWidth };
  }, [windowWidth, tokens.spacing.lg, tokens.spacing.sm]);

  const registerSale = (paymentMethod: PaymentMethod) => {
    const items = products
      .map((product) => ({ product, quantity: cart.order[product.id] ?? 0 }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) return;
    const unavailable = items.find((item) => item.quantity > item.product.stock);
    if (unavailable) {
      toast.show(`Estoque insuficiente: ${unavailable.product.name}`, "danger");
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
        ? `+ ${fmtBRL(totalValue)} ${saleItems[0].productName}`
        : `+ ${fmtBRL(totalValue)} (${totalQty} ${totalQty === 1 ? "item" : "itens"})`;
    store.addSale({ value: totalValue, items: saleItems, paymentMethod, label });
    cart.clear();
    setConfirmed(true);
    feedback("ok");
    toast.show("Venda registrada", "success");
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={fmtBRL(stats.total)}
        subtitle={`${todayLabel} · ${stats.count} ${stats.count === 1 ? "venda" : "vendas"}`}
        brand="Total de hoje"
      />

      <View style={styles.body}>
        {lowStock.length > 0 ? <LowStockBanner products={lowStock} /> : null}

        <SegmentedControl<InputMode>
          value={inputMode}
          onChange={switchMode}
          options={[
            { value: "manual", label: "Manual", icon: <Calculator size={16} color={isVoice ? tokens.palette.foregroundMuted : tokens.palette.primaryForeground} /> },
            { value: "voz", label: "Voz", icon: <Mic size={16} color={isVoice ? tokens.palette.primaryForeground : tokens.palette.foregroundMuted} /> },
          ]}
        />

        {tutorial ? (
          <VoiceTutorial
            idx={tutorial.idx}
            total={tutorial.total}
            text={tutorial.text}
            onClose={() => {
              stopTutorial();
              setTutorial(null);
            }}
          />
        ) : null}

        {products.length === 0 ? (
          <EmptyState
            title="Cadastre produtos para começar"
            description="Vá até a aba Produtos e cadastre os itens da sua banca."
          />
        ) : (
          <>
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
              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                numColumns={3}
                style={styles.list}
                columnWrapperStyle={{ gap: gridMetrics.gap, marginBottom: gridMetrics.gap }}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: p }) => (
                  <View style={{ width: gridMetrics.tileWidth }}>
                    <ProductSaleTile
                      product={p}
                      quantity={cart.order[p.id] ?? 0}
                      showControls={!isVoice}
                      lowStockThreshold={settings.lowStockThreshold}
                      tileWidth={gridMetrics.tileWidth}
                      onAdd={() => {
                        const result = cart.add(p, 1);
                        feedback(result.status === "none" ? "err" : "ok");
                        if (result.status === "none") {
                          toast.show(`Sem estoque de ${p.name}`, "warning");
                        }
                      }}
                      onRemove={() => {
                        cart.remove(p);
                        feedback("ok");
                      }}
                      onPressEditQuantity={() => setQtySheetProduct(p)}
                    />
                  </View>
                )}
              />
            )}
          </>
        )}
      </View>

      <CartBar
        total={cart.total}
        itemCount={cart.itemCount}
        onCheckout={() => setShowCheckout(true)}
        rightSlot={
          isVoice && speech.supported ? (
            <MicButton
              listening={speech.listening}
              processing={processing}
              durationMs={speech.recordingDurationMs}
              onStart={speech.start}
              onStop={speech.stop}
              onCancel={() => {
                setProcessing(false);
                void speech.cancel();
              }}
            />
          ) : null
        }
      />

      <CheckoutSheet
        visible={showCheckout}
        total={cart.total}
        onClose={() => setShowCheckout(false)}
        onConfirm={registerSale}
      />

      <OrderQuantitySheet
        visible={qtySheetProduct !== null}
        product={qtySheetProduct}
        currentQuantity={qtySheetProduct ? (cart.order[qtySheetProduct.id] ?? 0) : 0}
        onClose={() => setQtySheetProduct(null)}
        onApply={(quantity) => {
          if (!qtySheetProduct) return;
          cart.setQuantity(qtySheetProduct, quantity);
          feedback("ok");
        }}
      />

      {confirmed ? <ConfirmedOverlay /> : null}
    </ScreenContainer>
  );
}

function ConfirmedOverlay() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
    ]).start();
    return () => {
      Animated.timing(opacity, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
    };
  }, [scale, opacity]);

  return (
    <Animated.View style={[styles.confirmOverlay, { opacity }]} pointerEvents="none">
      <Animated.View style={[styles.confirmBox, { transform: [{ scale }] }]}>
        <Check size={80} color={tokens.palette.successForeground} strokeWidth={3.5} />
      </Animated.View>
    </Animated.View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    body: {
      flex: 1,
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.md,
      gap: t.spacing.sm,
    },
    list: { flex: 1, marginTop: t.spacing.xs },
    listContent: { paddingBottom: t.spacing.xxxl, flexGrow: 1 },
    confirmOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmBox: {
      width: 128,
      height: 128,
      borderRadius: 32,
      backgroundColor: t.palette.success,
      alignItems: "center",
      justifyContent: "center",
      ...t.shadows.lg,
    },
  });
}
