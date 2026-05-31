import { useSyncExternalStore } from "react";
import { normalizeText } from "@/src/lib/voice/normalizeText";
import type { Product, Sale } from "@/src/types";
import { storageGet, storageSet, storageRemove } from "@/src/lib/storage/storage";

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
  zeroAllProductStock() {
    if (state.products.length === 0) return;
    state = {
      ...state,
      products: state.products.map((p) => ({ ...p, stock: 0 })),
    };
    emit();
  },
  addSale(s: Omit<Sale, "id" | "timestamp"> & { timestamp?: number }): Sale {
    const sale: Sale = { id: uid(), timestamp: s.timestamp ?? Date.now(), ...s };
    const stockDeltas = saleStockDeltas(sale, -1);
    state = {
      sales: [sale, ...state.sales],
      products: applyStockDeltas(state.products, stockDeltas),
    };
    emit();
    return sale;
  },
  undoLast(): Sale | null {
    const [last, ...rest] = state.sales;
    if (!last) return null;
    const stockDeltas = saleStockDeltas(last, 1);
    state = {
      sales: rest,
      products: applyStockDeltas(state.products, stockDeltas),
    };
    emit();
    return last;
  },
  findProductByName(name: string): Product | undefined {
    const target = normalizeText(name);
    if (!target) return undefined;
    let best: { product: Product; score: number } | null = null;
    for (const product of state.products) {
      const candidate = normalizeText(product.name);
      let score = 0;
      if (candidate === target) score = 100;
      else if (candidate.startsWith(target)) score = 70 + target.length;
      else if (target.startsWith(candidate)) score = 60 + candidate.length;
      else if (candidate.includes(target)) score = 40 + target.length / Math.max(candidate.length, 1) * 10;
      else if (target.includes(candidate)) score = 30 + candidate.length / Math.max(target.length, 1) * 10;
      if (score > 0 && (!best || score > best.score)) best = { product, score };
    }
    return best?.product;
  },
};

function saleStockDeltas(sale: Sale, sign: 1 | -1): Map<string, number> {
  const deltas = new Map<string, number>();
  if (sale.items && sale.items.length > 0) {
    for (const item of sale.items) {
      deltas.set(item.productId, (deltas.get(item.productId) ?? 0) + sign * item.quantity);
    }
  } else if (sale.productId && sale.quantity) {
    deltas.set(sale.productId, (deltas.get(sale.productId) ?? 0) + sign * sale.quantity);
  }
  return deltas;
}

function applyStockDeltas(products: Product[], deltas: Map<string, number>): Product[] {
  if (deltas.size === 0) return products;
  return products.map((p) => {
    const delta = deltas.get(p.id);
    if (!delta) return p;
    return { ...p, stock: Math.max(0, +(p.stock + delta).toFixed(3)) };
  });
}

export { todayBounds, getTodayStats, groupByDay } from "./sales";
