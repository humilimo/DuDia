import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarDays, ChevronDown, X } from "lucide-react-native";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useStore } from "@/src/lib/store";
import type { PaymentMethod } from "@/src/lib/types";
import { colors } from "@/src/theme";

const paymentOrder: PaymentMethod[] = ["pix", "credito", "debito", "dinheiro"];
const paymentLabel: Record<PaymentMethod, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
};

type BalancePeriod = "today" | "7d" | "15d" | "30d" | "day";

const fmtMoney = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;
const fmtUnitLabel = (qty: number, unit: string) => {
  if (unit === "un") return `${qty} unidades`;
  return `${qty}${unit}`;
};

function parseDateLabel(key: string) {
  const [y, m, d] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function BalancoScreen() {
  const { sales } = useStore();
  const [period, setPeriod] = useState<BalancePeriod>("today");
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);

  const days = useMemo(() => {
    const map = new Map<string, { date: string; sales: typeof sales; total: number }>();
    for (const s of sales) {
      const d = new Date(s.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { date: key, sales: [], total: 0 });
      const entry = map.get(key)!;
      entry.sales.push(s);
      entry.total += s.value;
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [sales]);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    if (days.some((day) => day.date === todayKey)) return todayKey;
    return days[0]?.date ?? null;
  });

  const periodLabel = useMemo(() => {
    if (period === "today") return "Hoje";
    if (period === "7d") return "Últimos 7 dias";
    if (period === "15d") return "Últimos 15 dias";
    if (period === "30d") return "Últimos 30 dias";
    return selectedDate ? parseDateLabel(selectedDate) : "Dia específico";
  }, [period, selectedDate]);

  const filteredSales = useMemo(() => {
    if (period === "day") {
      const day = days.find((d) => d.date === selectedDate);
      return day?.sales ?? [];
    }
    if (period === "today") {
      const day = days.find((d) => d.date === todayKey);
      return day?.sales ?? [];
    }
    const windowDays = period === "7d" ? 7 : period === "15d" ? 15 : 30;
    const now = Date.now();
    const minTs = now - windowDays * 24 * 60 * 60 * 1000;
    return sales.filter((s) => s.timestamp >= minTs && s.timestamp <= now);
  }, [period, days, selectedDate, todayKey, sales]);

  const summary = useMemo(() => {
    if (filteredSales.length === 0) {
      return {
        total: 0,
        byPayment: { pix: 0, credito: 0, debito: 0, dinheiro: 0 } as Record<PaymentMethod, number>,
        byItem: [] as Array<{ name: string; qty: number; unit: string }>,
      };
    }

    const byPayment: Record<PaymentMethod, number> = { pix: 0, credito: 0, debito: 0, dinheiro: 0 };
    const byItemMap = new Map<string, { name: string; qty: number; unit: string }>();
    let total = 0;

    for (const sale of filteredSales) {
      total += sale.value;
      if (sale.paymentMethod) byPayment[sale.paymentMethod] += sale.value;

      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          const key = `${item.productName}::${item.unit}`;
          const current = byItemMap.get(key);
          byItemMap.set(key, {
            name: item.productName,
            unit: item.unit,
            qty: +(item.quantity + (current?.qty ?? 0)).toFixed(3),
          });
        }
        continue;
      }

      if (sale.productName && sale.quantity) {
        const unit = sale.unit || "un";
        const key = `${sale.productName}::${unit}`;
        const current = byItemMap.get(key);
        byItemMap.set(key, {
          name: sale.productName,
          unit,
          qty: +(sale.quantity + (current?.qty ?? 0)).toFixed(3),
        });
      }
    }

    const byItem = Array.from(byItemMap.values()).sort((a, b) => b.qty - a.qty);
    return { total, byPayment, byItem };
  }, [filteredSales]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Balanço" subtitle={periodLabel} />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.periodBtn} onPress={() => setShowPeriodModal(true)}>
          <View style={styles.periodLeft}>
            <CalendarDays size={18} color={colors.primary} />
            <Text style={styles.periodText}>{periodLabel}</Text>
          </View>
          <ChevronDown size={18} color={colors.mutedForeground} />
        </Pressable>

        <View style={styles.totalCard}>
          <Text style={styles.cardLabel}>Total do dia</Text>
          <Text style={styles.totalValue}>{fmtMoney(summary.total)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Por forma de pagamento</Text>
        <View style={styles.grid}>
          {paymentOrder.map((method) => (
            <View key={method} style={styles.paymentCard}>
              <Text style={styles.cardLabel}>{paymentLabel[method]}</Text>
              <Text style={styles.cardValue}>{fmtMoney(summary.byPayment[method])}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Itens vendidos</Text>
        {summary.byItem.length === 0 ? (
          <Text style={styles.empty}>Sem itens vendidos neste dia.</Text>
        ) : (
          summary.byItem.map((item) => (
            <View key={`${item.name}-${item.unit}`} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>{fmtUnitLabel(item.qty, item.unit)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showPeriodModal} transparent animationType="fade" onRequestClose={() => setShowPeriodModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPeriodModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolher período</Text>
              <Pressable onPress={() => setShowPeriodModal(false)}>
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Pressable style={styles.optionBtn} onPress={() => { setPeriod("today"); setShowPeriodModal(false); }}>
              <Text style={styles.optionText}>Hoje</Text>
            </Pressable>
            <Pressable style={styles.optionBtn} onPress={() => { setPeriod("7d"); setShowPeriodModal(false); }}>
              <Text style={styles.optionText}>Últimos 7 dias</Text>
            </Pressable>
            <Pressable style={styles.optionBtn} onPress={() => { setPeriod("15d"); setShowPeriodModal(false); }}>
              <Text style={styles.optionText}>Últimos 15 dias</Text>
            </Pressable>
            <Pressable style={styles.optionBtn} onPress={() => { setPeriod("30d"); setShowPeriodModal(false); }}>
              <Text style={styles.optionText}>Últimos 30 dias</Text>
            </Pressable>
            <Pressable
              style={[styles.optionBtn, styles.optionHighlight]}
              onPress={() => {
                setShowPeriodModal(false);
                setShowDayModal(true);
              }}
            >
              <Text style={styles.optionText}>Dia específico</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showDayModal} transparent animationType="fade" onRequestClose={() => setShowDayModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDayModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar dia</Text>
              <Pressable onPress={() => setShowDayModal(false)}>
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 260 }}>
              {days.length === 0 ? (
                <Text style={styles.empty}>Sem dias com venda.</Text>
              ) : (
                days.map((day) => (
                  <Pressable
                    key={day.date}
                    style={styles.optionBtn}
                    onPress={() => {
                      setSelectedDate(day.date);
                      setPeriod("day");
                      setShowDayModal(false);
                    }}
                  >
                    <Text style={styles.optionText}>{parseDateLabel(day.date)}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  periodBtn: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  periodLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  periodText: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  totalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedForeground,
    textTransform: "uppercase",
  },
  totalValue: { marginTop: 6, fontSize: 30, fontWeight: "900" },
  sectionTitle: { marginTop: 8, marginBottom: 2, fontSize: 12, fontWeight: "800", color: colors.mutedForeground },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paymentCard: { width: "48%", backgroundColor: colors.card, borderRadius: 16, padding: 14 },
  cardValue: { marginTop: 6, fontSize: 19, fontWeight: "800" },
  empty: {
    textAlign: "center",
    color: colors.mutedForeground,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemName: { flex: 1, fontSize: 16, fontWeight: "700", marginRight: 10 },
  itemQty: { fontSize: 16, fontWeight: "800", color: colors.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: colors.foreground },
  optionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  optionHighlight: { borderWidth: 1, borderColor: colors.primary },
  optionText: { fontSize: 15, fontWeight: "600", color: colors.foreground },
});
