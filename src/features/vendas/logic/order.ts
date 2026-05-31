import type { Product } from "@/src/types";

export type Order = Record<string, number>;

export type AddOrderResult =
  | { status: "added"; added: number }
  | { status: "partial"; added: number; requested: number }
  | { status: "none"; reason: "no_stock" | "full" };

export function applyQuantityToOrder(
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

export function warningForAddResult(productName: string, result: AddOrderResult): string | undefined {
  if (result.status === "partial") {
    return `Unidades insuficientes para ${productName}: adicionado ${result.added} de ${result.requested}.`;
  }
  if (result.status === "none") {
    return `Sem unidades disponíveis para ${productName}.`;
  }
  return undefined;
}

export function decrementOrder(order: Order, productId: string): Order {
  const quantity = order[productId] ?? 0;
  if (quantity <= 1) {
    const { [productId]: _removed, ...rest } = order;
    return rest;
  }
  return { ...order, [productId]: quantity - 1 };
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
