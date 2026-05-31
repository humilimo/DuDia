import type { Product } from "@/src/types";

export type Order = Record<string, number>;

export type AddOrderResult =
  | { status: "added"; added: number }
  | { status: "partial"; added: number; requested: number }
  | { status: "none"; reason: "no_stock" | "full" };

function roundOrderQty(product: Product, n: number): number {
  if (product.unit === "un") return Math.round(n);
  return +n.toFixed(3);
}

function normalizeRequestedAdd(product: Product, requested: number): number {
  if (product.unit === "un") return Math.max(1, Math.round(requested));
  const q = +Math.abs(requested).toFixed(3);
  return q < 0.001 ? 0.001 : q;
}

export function setOrderQuantity(order: Order, product: Product, rawDesired: number): Order {
  if (product.stock <= 0) {
    const { [product.id]: _removed, ...rest } = order;
    return rest;
  }
  let desired: number;
  if (product.unit === "un") {
    desired = Math.min(Math.max(0, Math.floor(rawDesired)), Math.floor(product.stock));
  } else {
    desired = +Math.min(Math.max(0, rawDesired), product.stock).toFixed(3);
  }
  if (desired <= 0) {
    const { [product.id]: _r, ...rest } = order;
    return rest;
  }
  return { ...order, [product.id]: desired };
}

export function applyQuantityToOrder(
  order: Order,
  product: Product,
  requested: number,
): { next: Order; result: AddOrderResult } {
  const qty = normalizeRequestedAdd(product, requested);
  if (product.stock <= 0) {
    return { next: order, result: { status: "none", reason: "no_stock" } };
  }
  const inOrder = order[product.id] ?? 0;
  const room = roundOrderQty(product, product.stock - inOrder);
  if (room <= 0) {
    return { next: order, result: { status: "none", reason: "full" } };
  }
  const toAdd = roundOrderQty(product, Math.min(qty, room));
  const newLine = roundOrderQty(product, inOrder + toAdd);
  const next = { ...order, [product.id]: newLine };
  if (toAdd < qty - 1e-9) {
    return { next, result: { status: "partial", added: toAdd, requested: qty } };
  }
  return { next, result: { status: "added", added: toAdd } };
}

export function warningForAddResult(productName: string, result: AddOrderResult): string | undefined {
  if (result.status === "partial") {
    return `Unidades insuficientes para ${productName}: adicionado ${result.added} de ${result.requested}.`;
  }
  if (result.status === "none") {
    return `Sem unidades disponíveis para ${productName}.`;
  }
  return undefined;
}

export function decrementOrder(order: Order, product: Product): Order {
  const quantity = order[product.id] ?? 0;
  const step = product.unit === "un" ? 1 : 1;
  const nextQty = roundOrderQty(product, quantity - step);
  if (nextQty <= 0 || (product.unit !== "un" && nextQty < 0.001)) {
    const { [product.id]: _removed, ...rest } = order;
    return rest;
  }
  return { ...order, [product.id]: nextQty };
}

export function pruneOrder(order: Order, products: Product[]): Order {
  const productIds = new Set(products.map((p) => p.id));
  const next: Order = {};
  let changed = false;
  for (const [id, qty] of Object.entries(order)) {
    if (productIds.has(id) && qty > 0) next[id] = qty;
    else changed = true;
  }
  return changed ? next : order;
}

export function orderTotal(order: Order, products: Product[]): number {
  return products.reduce((sum, product) => sum + product.price * (order[product.id] ?? 0), 0);
}

export function orderItemCount(order: Order): number {
  return Object.values(order).reduce((sum, qty) => sum + qty, 0);
}
