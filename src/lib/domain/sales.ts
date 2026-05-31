import type { PaymentMethod, Sale } from "@/src/types";

export interface DayBucket {
  date: string;
  total: number;
  count: number;
  sales: Sale[];
}

export interface ItemAggregate {
  name: string;
  unit: string;
  qty: number;
}

export interface PaymentBreakdown {
  pix: number;
  credito: number;
  debito: number;
  dinheiro: number;
}

export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayKey(date: Date = new Date()): string {
  return dayKey(date.getTime());
}

export function todayBounds(d: Date = new Date()): { start: number; end: number } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

export function isToday(timestamp: number, ref: Date = new Date()): boolean {
  const { start, end } = todayBounds(ref);
  return timestamp >= start && timestamp < end;
}

export function getTodayStats(sales: Sale[]): { total: number; count: number; todays: Sale[] } {
  const todays = sales.filter((s) => isToday(s.timestamp));
  const total = todays.reduce((acc, s) => acc + s.value, 0);
  const count = todays.filter((s) => s.value > 0).length;
  return { total, count, todays };
}

export function groupByDay(sales: Sale[]): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const s of sales) {
    const key = dayKey(s.timestamp);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { date: key, total: 0, count: 0, sales: [] };
      map.set(key, bucket);
    }
    bucket.total += s.value;
    if (s.value > 0) bucket.count += 1;
    bucket.sales.push(s);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function filterByPeriod(
  sales: Sale[],
  period: "today" | "7d" | "15d" | "30d",
  now: Date = new Date(),
): Sale[] {
  if (period === "today") return sales.filter((s) => isToday(s.timestamp, now));
  const windowDays = period === "7d" ? 7 : period === "15d" ? 15 : 30;
  const min = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  return sales.filter((s) => s.timestamp >= min && s.timestamp <= now.getTime());
}

export function aggregateItems(sales: Sale[]): ItemAggregate[] {
  const map = new Map<string, ItemAggregate>();
  for (const sale of sales) {
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        const key = `${item.productName}::${item.unit}`;
        const current = map.get(key);
        map.set(key, {
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
      const current = map.get(key);
      map.set(key, {
        name: sale.productName,
        unit,
        qty: +(sale.quantity + (current?.qty ?? 0)).toFixed(3),
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
}

export function aggregateByPayment(sales: Sale[]): PaymentBreakdown {
  const breakdown: PaymentBreakdown = { pix: 0, credito: 0, debito: 0, dinheiro: 0 };
  for (const sale of sales) {
    if (sale.paymentMethod) breakdown[sale.paymentMethod] += sale.value;
  }
  return breakdown;
}

export const PAYMENT_METHODS: PaymentMethod[] = ["pix", "credito", "debito", "dinheiro"];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
};

export function fmtBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function fmtUnit(qty: number, unit: string): string {
  if (unit === "un") return `${qty} ${qty === 1 ? "unidade" : "unidades"}`;
  return `${qty}${unit}`;
}
