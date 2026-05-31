import { useSyncExternalStore } from "react";
import { normalizeText } from "./normalizeText";
import type { Product, Sale } from "./types";
import { storageGet, storageSet, storageRemove } from "./storage";

const PRODUCTS_KEY = "feira:products";
const SALES_KEY = "feira:sales";
const SEED_KEY = "feira:seeded";

const SEED_PRODUCTS: Omit<Product, "id">[] = [
  { name: "Coxinha", price: 8, unit: "un", stock: 25 },
  { name: "Pastel de carne", price: 10, unit: "un", stock: 18 },
  { name: "Esfiha de frango", price: 7, unit: "un", stock: 30 },
  { name: "Pão de queijo", price: 5, unit: "un", stock: 40 },
  { name: "Hambúrguer", price: 18, unit: "un", stock: 12 },
  { name: "Cachorro-quente", price: 14, unit: "un", stock: 15 },
  { name: "Coca-Cola lata", price: 6, unit: "un", stock: 50 },
  { name: "Suco de laranja", price: 9, unit: "un", stock: 20 },
  { name: "Brigadeiro", price: 4, unit: "un", stock: 35 },
  { name: "Misto quente", price: 12, unit: "un", stock: 22 },
];

interface State {
  products: Product[];
  sales: Sale[];
}

const listeners = new Set<() => void>();
let state: State = { products: [], sales: [] };
let initialized = false;
let initPromise: Promise<void> | null = null;

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function maybeSeedProducts(existing: Product[]): Promise<Product[]> {
  if (existing.length > 0) return existing;
  const seededFlag = await storageGet<string | null>(SEED_KEY, null);
  if (seededFlag === "1") return existing;
  const seeded = SEED_PRODUCTS.map((p) => ({ id: uid(), ...p }));
  await storageSet(SEED_KEY, "1");
  await storageSet(PRODUCTS_KEY, seeded);
  return seeded;
}

async function loadState(): Promise<State> {
  const products = await maybeSeedProducts(await storageGet<Product[]>(PRODUCTS_KEY, []));
  const sales = await storageGet<Sale[]>(SALES_KEY, []);
  return { products, sales };
}

async function persist() {
  await storageSet(PRODUCTS_KEY, state.products);
  await storageSet(SALES_KEY, state.sales);
}

function emit() {
  void persist().then(() => listeners.forEach((l) => l()));
}

export async function initStore(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = loadState().then((loaded) => {
      state = loaded;
      initialized = true;
      listeners.forEach((l) => l());
    });
  }
  await initPromise;
}

export async function resetStoreData(): Promise<void> {
  await storageRemove(PRODUCTS_KEY);
  await storageRemove(SALES_KEY);
  await storageRemove(SEED_KEY);
  initialized = false;
  initPromise = null;
  state = { products: [], sales: [] };
  await initStore();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getProductById(id: string): Product | undefined {
  return state.products.find((p) => p.id === id);
}

export const store = {
  addProduct(p: Omit<Product, "id">): Product {
    const product: Product = { id: uid(), ...p };
    state = { ...state, products: [product, ...state.products] };
    emit();
    return product;
  },
  updateProduct(id: string, patch: Partial<Product>) {
    state = {
      ...state,
      products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    };
    emit();
  },
  removeProduct(id: string) {
    state = { ...state, products: state.products.filter((p) => p.id !== id) };
    emit();
  },
  adjustStock(id: string, delta: number) {
    state = {
      ...state,
      products: state.products.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, +(p.stock + delta).toFixed(3)) } : p,
      ),
    };
    emit();
  },
  addSale(s: Omit<Sale, "id" | "timestamp"> & { timestamp?: number }): Sale {
    const sale: Sale = { id: uid(), timestamp: s.timestamp ?? Date.now(), ...s };
    state = { ...state, sales: [sale, ...state.sales] };
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item) => store.adjustStock(item.productId, -item.quantity));
    } else if (sale.productId && sale.quantity) {
      store.adjustStock(sale.productId, -sale.quantity);
    } else {
      emit();
    }
    return sale;
  },
  undoLast(): Sale | null {
    const [last, ...rest] = state.sales;
    if (!last) return null;
    state = { ...state, sales: rest };
    if (last.items && last.items.length > 0) {
      last.items.forEach((item) => store.adjustStock(item.productId, item.quantity));
    } else if (last.productId && last.quantity) {
      store.adjustStock(last.productId, last.quantity);
    } else {
      emit();
    }
    return last;
  },
  findProductByName(name: string): Product | undefined {
    const target = normalizeText(name);
    return state.products.find(
      (p) =>
        normalizeText(p.name) === target ||
        normalizeText(p.name).includes(target) ||
        target.includes(normalizeText(p.name)),
    );
  },
};

export function todayBounds(d: Date = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
}

export function getTodayStats(sales: Sale[]) {
  const { start, end } = todayBounds();
  const todays = sales.filter((s) => s.timestamp >= start && s.timestamp < end);
  const total = todays.reduce((acc, s) => acc + s.value, 0);
  const count = todays.filter((s) => s.value > 0).length;
  return { total, count, todays };
}

export function groupByDay(sales: Sale[]) {
  const map = new Map<string, { date: string; total: number; count: number; sales: Sale[] }>();
  for (const s of sales) {
    const d = new Date(s.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { date: key, total: 0, count: 0, sales: [] });
    const entry = map.get(key)!;
    entry.total += s.value;
    if (s.value > 0) entry.count += 1;
    entry.sales.push(s);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}
