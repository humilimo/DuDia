import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { CalendarDays, ChevronDown } from "lucide-react-native";
import {
  BottomSheet,
  Card,
  ScreenContainer,
  ScreenHeader,
  SegmentedControl,
  StatCard,
  Text,
} from "@/src/components/ui";
import { useStore } from "@/src/lib/domain/store";
import {
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  aggregateByPayment,
  aggregateItems,
  dayKey,
  filterByPeriod,
  fmtBRL,
  fmtUnit,
  groupByDay,
  todayKey,
} from "@/src/lib/domain/sales";
import { useTheme, type Tokens } from "@/src/theme";

type BalancePeriod = "today" | "7d" | "15d" | "30d" | "day";

function parseDateLabel(key: string) {
  const [y, m, d] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function BalancoScreen() {
  const { sales } = useStore();
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [period, setPeriod] = useState<BalancePeriod>("today");
  const [showDayModal, setShowDayModal] = useState(false);

  const days = useMemo(() => groupByDay(sales), [sales]);
  const today = todayKey();
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    days.some((day) => day.date === today) ? today : (days[0]?.date ?? null),
  );

  const periodLabel = useMemo(() => {
    if (period === "today") return "Hoje";
    if (period === "7d") return "Últimos 7 dias";
    if (period === "15d") return "Últimos 15 dias";
    if (period === "30d") return "Últimos 30 dias";
    return selectedDate ? parseDateLabel(selectedDate) : "Dia específico";
  }, [period, selectedDate]);

  const filteredSales = useMemo(() => {
    if (period === "day") {
      return days.find((d) => d.date === selectedDate)?.sales ?? [];
    }
    return filterByPeriod(sales, period);
  }, [period, days, selectedDate, sales]);

  const total = useMemo(() => filteredSales.reduce((acc, s) => acc + s.value, 0), [filteredSales]);
  const byPayment = useMemo(() => aggregateByPayment(filteredSales), [filteredSales]);
  const byItem = useMemo(() => aggregateItems(filteredSales), [filteredSales]);
  const maxQty = byItem[0]?.qty ?? 0;
  const maxPayment = Math.max(...PAYMENT_METHODS.map((m) => byPayment[m]), 0);

  return (
    <ScreenContainer>
      <ScreenHeader title="Balanço" subtitle={periodLabel} />

      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedControl<BalancePeriod>
          value={period === "day" ? "30d" : period}
          onChange={(v) => setPeriod(v)}
          options={[
            { value: "today", label: "Hoje" },
            { value: "7d", label: "7 dias" },
            { value: "15d", label: "15 dias" },
            { value: "30d", label: "30 dias" },
          ]}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Selecionar dia específico"
          onPress={() => setShowDayModal(true)}
          style={({ pressed }) => [styles.dayPicker, pressed && styles.pressed]}
        >
          <View style={styles.dayPickerLeft}>
            <CalendarDays size={16} color={tokens.palette.primary} />
            <Text variant="caption" tone="primary">
              {period === "day" && selectedDate ? parseDateLabel(selectedDate) : "Escolher dia específico"}
            </Text>
          </View>
          <ChevronDown size={16} color={tokens.palette.foregroundMuted} />
        </Pressable>

        <StatCard label="Total do período" value={fmtBRL(total)} tone="primary" />

        <Text variant="overline" tone="muted" style={styles.sectionTitle}>
          Por forma de pagamento
        </Text>
        <Card variant="flat" padding="md" style={styles.paymentCard}>
          {PAYMENT_METHODS.map((method) => {
            const value = byPayment[method];
            const pct = maxPayment > 0 ? (value / maxPayment) * 100 : 0;
            return (
              <View key={method} style={styles.paymentRow}>
                <View style={styles.paymentHeader}>
                  <Text variant="bodyStrong">{PAYMENT_LABELS[method]}</Text>
                  <Text variant="bodyStrong" tone={value > 0 ? "primary" : "subtle"}>
                    {fmtBRL(value)}
                  </Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.max(2, pct)}%`, opacity: value > 0 ? 1 : 0.25 },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Card>

        <Text variant="overline" tone="muted" style={styles.sectionTitle}>
          Itens vendidos
        </Text>
        {byItem.length === 0 ? (
          <Card variant="flat" padding="md">
            <Text variant="body" tone="muted" style={styles.empty}>
              Sem itens vendidos neste período.
            </Text>
          </Card>
        ) : (
          <Card variant="flat" padding="md" style={styles.itemsCard}>
            {byItem.map((item) => {
              const pct = maxQty > 0 ? (item.qty / maxQty) * 100 : 0;
              return (
                <View key={`${item.name}-${item.unit}`} style={styles.itemRow}>
                  <View style={styles.itemHeader}>
                    <Text variant="bodyStrong" numberOfLines={1} style={styles.itemName}>
                      {item.name}
                    </Text>
                    <Text variant="bodyStrong" tone="primary">
                      {fmtUnit(item.qty, item.unit)}
                    </Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFillAccent, { width: `${Math.max(2, pct)}%` }]} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>

      <BottomSheet visible={showDayModal} onClose={() => setShowDayModal(false)} title="Selecionar dia">
        <ScrollView style={styles.daysList}>
          {days.length === 0 ? (
            <Text variant="body" tone="muted" style={styles.empty}>
              Sem dias com venda.
            </Text>
          ) : (
            days.map((day) => {
              const isTodayDay = day.date === today;
              const active = period === "day" && selectedDate === day.date;
              return (
                <Pressable
                  key={day.date}
                  accessibilityRole="button"
                  accessibilityLabel={parseDateLabel(day.date)}
                  onPress={() => {
                    setSelectedDate(day.date);
                    setPeriod("day");
                    setShowDayModal(false);
                  }}
                  style={({ pressed }) => [
                    styles.dayOption,
                    active && styles.dayOptionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">
                      {isTodayDay ? "Hoje · " : ""}
                      {parseDateLabel(day.date)}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {fmtBRL(day.total)} · {day.count} {day.count === 1 ? "venda" : "vendas"}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </BottomSheet>
    </ScreenContainer>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    content: { padding: t.spacing.lg, paddingBottom: t.spacing.huge, gap: t.spacing.sm },
    dayPicker: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: t.spacing.md,
      borderRadius: t.radius.md,
      backgroundColor: t.palette.primarySoft,
    },
    dayPickerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    pressed: { opacity: 0.7 },
    sectionTitle: { marginTop: t.spacing.sm, marginLeft: t.spacing.xs },
    paymentCard: { gap: t.spacing.md },
    paymentRow: { gap: 6 },
    paymentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    barBg: { height: 8, borderRadius: 4, backgroundColor: t.palette.surfaceMuted, overflow: "hidden" },
    barFill: { height: "100%", backgroundColor: t.palette.primary, borderRadius: 4 },
    barFillAccent: { height: "100%", backgroundColor: t.palette.accent, borderRadius: 4 },
    itemsCard: { gap: t.spacing.md },
    itemRow: { gap: 6 },
    itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: t.spacing.sm },
    itemName: { flex: 1 },
    empty: { textAlign: "center" },
    daysList: { maxHeight: 320 },
    dayOption: {
      padding: t.spacing.md,
      borderRadius: t.radius.md,
      backgroundColor: t.palette.surfaceMuted,
      marginBottom: 6,
    },
    dayOptionActive: { backgroundColor: t.palette.primarySoft, borderWidth: 1, borderColor: t.palette.primary },
  });
}
