import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ArrowLeft, ChevronDown, ChevronRight, Receipt } from "lucide-react-native";
import {
  Badge,
  Card,
  EmptyState,
  IconButton,
  ScreenContainer,
  ScreenHeader,
  Text,
} from "@/src/components/ui";
import { useStore } from "@/src/lib/domain/store";
import { PAYMENT_LABELS, fmtBRL, groupByDay } from "@/src/lib/domain/sales";
import { useTheme, type Tokens } from "@/src/theme";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const days = useMemo(() => groupByDay(sales), [sales]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const day = selected ? days.find((d) => d.date === selected) : null;

  if (day) {
    const dt = parseDate(day.date);
    return (
      <ScreenContainer>
        <ScreenHeader
          title={`${DOW[dt.getDay()]}, ${dt.getDate()} de ${MONTHS[dt.getMonth()]}`}
          subtitle={`${fmtBRL(day.total)} · ${day.count} ${day.count === 1 ? "venda" : "vendas"}`}
          trailing={
            <IconButton
              label="Voltar"
              tone="primary"
              filled={false}
              size={40}
              icon={<ArrowLeft size={20} color={tokens.palette.primaryForeground} />}
              onPress={() => {
                setSelected(null);
                setExpandedSaleId(null);
              }}
            />
          }
        />
        <ScrollView contentContainerStyle={styles.list}>
          {day.sales.map((s) => {
            const isExpanded = expandedSaleId === s.id;
            const hasDetails = (s.items && s.items.length > 0) || s.paymentMethod || s.quantity != null;
            return (
              <Card key={s.id} variant="flat" padding="none" style={styles.saleCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${s.label}, ${fmtTime(s.timestamp)}`}
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={() =>
                    hasDetails && setExpandedSaleId((current) => (current === s.id ? null : s.id))
                  }
                  disabled={!hasDetails}
                  style={styles.saleRow}
                >
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" tone={s.value >= 0 ? "success" : "danger"} numberOfLines={1}>
                      {s.label}
                    </Text>
                    <View style={styles.saleMetaRow}>
                      <Text variant="caption" tone="muted">
                        {fmtTime(s.timestamp)}
                      </Text>
                      {s.paymentMethod ? (
                        <Badge label={PAYMENT_LABELS[s.paymentMethod]} tone="primary" />
                      ) : null}
                    </View>
                  </View>
                  {hasDetails ? (
                    <ChevronDown
                      size={20}
                      color={tokens.palette.foregroundMuted}
                      style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}
                    />
                  ) : null}
                </Pressable>
                {isExpanded && hasDetails ? (
                  <View style={styles.details}>
                    {s.items && s.items.length > 0
                      ? s.items.map((item) => (
                          <View key={item.productId} style={styles.itemRow}>
                            <View style={styles.itemLeft}>
                              <View style={styles.qtyBadge}>
                                <Text variant="caption" tone="primary">
                                  {item.quantity}
                                </Text>
                              </View>
                              <Text variant="body" numberOfLines={1} style={styles.flex}>
                                {item.productName}
                              </Text>
                            </View>
                            <Text variant="caption" tone="muted">
                              {fmtBRL(item.price * item.quantity)}
                            </Text>
                          </View>
                        ))
                      : s.quantity ? (
                          <Text variant="caption" tone="muted">
                            {s.quantity}
                            {s.unit} · {s.productName}
                          </Text>
                        ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Histórico"
        subtitle={`${days.length} ${days.length === 1 ? "dia" : "dias"} de vendas`}
      />
      {days.length === 0 ? (
        <View style={styles.flex}>
          <EmptyState
            icon={<Receipt size={32} color={tokens.palette.primary} />}
            title="Sem vendas registradas"
            description="Suas vendas aparecerão aqui agrupadas por dia."
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {days.map((d) => {
            const dt = parseDate(d.date);
            const today = new Date();
            const isToday =
              dt.getDate() === today.getDate() &&
              dt.getMonth() === today.getMonth() &&
              dt.getFullYear() === today.getFullYear();
            return (
              <Pressable
                key={d.date}
                accessibilityRole="button"
                accessibilityLabel={`${isToday ? "Hoje" : parseDate(d.date).toLocaleDateString("pt-BR")}, ${fmtBRL(d.total)}, ${d.count} vendas`}
                onPress={() => setSelected(d.date)}
                style={({ pressed }) => [styles.dayCardPressable, pressed && styles.pressed]}
              >
                <Card variant="elevated" padding="md" style={styles.dayCard}>
                  <View style={styles.flex}>
                    <Text variant="caption" tone="muted">
                      {isToday ? "Hoje" : `${DOW[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()]}`}
                    </Text>
                    <Text variant="title" style={styles.dayTotal}>
                      {fmtBRL(d.total)}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {d.count} {d.count === 1 ? "venda" : "vendas"}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={tokens.palette.foregroundMuted} />
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    list: { padding: t.spacing.lg, paddingBottom: t.spacing.huge, gap: t.spacing.sm },
    flex: { flex: 1 },
    saleCard: { overflow: "hidden" },
    saleRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: t.spacing.lg,
      gap: t.spacing.sm,
    },
    saleMetaRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm, marginTop: 2 },
    details: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.palette.border,
      padding: t.spacing.lg,
      gap: t.spacing.xs,
    },
    itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    itemLeft: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm, flex: 1 },
    qtyBadge: {
      minWidth: 32,
      height: 28,
      borderRadius: t.radius.xs,
      backgroundColor: t.palette.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },
    dayCardPressable: { borderRadius: t.radius.lg },
    pressed: { opacity: 0.85 },
    dayCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    dayTotal: { marginTop: 2, fontSize: 24, lineHeight: 28 },
  });
}
