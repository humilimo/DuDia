import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react-native";
import { useStore, groupByDay } from "@/src/lib/store";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import type { PaymentMethod } from "@/src/lib/types";
import { colors } from "@/src/theme";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
};

function fmtBRL(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function parseDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function HistoricoScreen() {
  const { sales } = useStore();
  const days = groupByDay(sales);
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const day = selected ? days.find((d) => d.date === selected) : null;

  function toggleSale(id: string) {
    setExpandedSaleId((current) => (current === id ? null : id));
  }

  function backToDays() {
    setSelected(null);
    setExpandedSaleId(null);
  }

  if (day) {
    const dt = parseDate(day.date);
    return (
      <View style={styles.screen}>
        <ScreenHeader
          title={`${DOW[dt.getDay()]}, ${dt.getDate()} de ${MONTHS[dt.getMonth()]}`}
          subtitle={`${fmtBRL(day.total)} · ${day.count} ${day.count === 1 ? "venda" : "vendas"}`}
        />
        <View style={styles.backRow}>
          <Pressable onPress={backToDays} style={styles.backBtn}>
            <ArrowLeft size={16} color={colors.primary} />
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {day.sales.map((s) => {
            const isExpanded = expandedSaleId === s.id;
            const hasDetails =
              (s.items && s.items.length > 0) || s.paymentMethod || s.quantity != null;
            return (
              <View key={s.id} style={styles.card}>
                <Pressable
                  onPress={() => hasDetails && toggleSale(s.id)}
                  style={styles.saleRow}
                  disabled={!hasDetails}
                >
                  <View style={styles.flex}>
                    <Text
                      style={[styles.saleLabel, s.value >= 0 ? styles.positive : styles.negative]}
                    >
                      {s.label}
                    </Text>
                    <Text style={styles.saleMeta}>
                      {fmtTime(s.timestamp)}
                      {s.paymentMethod ? ` · ${PAYMENT_LABELS[s.paymentMethod]}` : ""}
                    </Text>
                  </View>
                  {hasDetails && (
                    <ChevronDown
                      size={20}
                      color={colors.mutedForeground}
                      style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}
                    />
                  )}
                </Pressable>
                {isExpanded && hasDetails && (
                  <View style={styles.details}>
                    {s.items && s.items.length > 0
                      ? s.items.map((item) => (
                          <View key={item.productId} style={styles.itemRow}>
                            <View style={styles.itemLeft}>
                              <Text style={styles.qtyBadge}>{item.quantity}</Text>
                              <Text style={styles.itemName} numberOfLines={1}>
                                {item.productName}
                              </Text>
                            </View>
                            <Text style={styles.itemPrice}>
                              {fmtBRL(item.price * item.quantity)}
                            </Text>
                          </View>
                        ))
                      : s.quantity ? (
                          <Text style={styles.saleMeta}>
                            {s.quantity}
                            {s.unit} · {s.productName}
                          </Text>
                        ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Histórico"
        subtitle={`${days.length} ${days.length === 1 ? "dia" : "dias"} de vendas`}
      />
      <ScrollView contentContainerStyle={styles.list}>
        {days.length === 0 && (
          <Text style={styles.empty}>Sem vendas ainda.</Text>
        )}
        {days.map((d) => {
          const dt = parseDate(d.date);
          const today = new Date();
          const isToday =
            dt.getDate() === today.getDate() &&
            dt.getMonth() === today.getMonth() &&
            dt.getFullYear() === today.getFullYear();
          return (
            <Pressable key={d.date} style={styles.dayCard} onPress={() => setSelected(d.date)}>
              <View>
                <Text style={styles.dayLabel}>
                  {isToday
                    ? "Hoje"
                    : `${DOW[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()]}`}
                </Text>
                <Text style={styles.dayTotal}>{fmtBRL(d.total)}</Text>
                <Text style={styles.dayCount}>{d.count} vendas</Text>
              </View>
              <ChevronRight size={24} color={colors.mutedForeground} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  backRow: { paddingHorizontal: 16, marginTop: 12, marginBottom: 2 },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  card: { backgroundColor: colors.card, borderRadius: 16, overflow: "hidden" },
  saleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  flex: { flex: 1 },
  saleLabel: { fontSize: 18, fontWeight: "700" },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  saleMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  details: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  qtyBadge: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontWeight: "900",
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  itemName: { fontWeight: "600", flex: 1 },
  itemPrice: { fontSize: 12, color: colors.mutedForeground },
  empty: {
    textAlign: "center",
    color: colors.mutedForeground,
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 16,
  },
  dayCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
  },
  dayLabel: { fontSize: 14, fontWeight: "600", color: colors.mutedForeground },
  dayTotal: { fontSize: 24, fontWeight: "900", marginTop: 4 },
  dayCount: { fontSize: 12, color: colors.mutedForeground },
});
