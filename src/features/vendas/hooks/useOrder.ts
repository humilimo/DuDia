import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/src/types";
import {
  applyQuantityToOrder,
  decrementOrder,
  orderItemCount,
  orderTotal,
  pruneOrder,
  type Order,
  type AddOrderResult,
} from "../logic/order";

export interface UseOrderReturn {
  order: Order;
  total: number;
  itemCount: number;
  hasItems: boolean;
  clear: () => void;
  remove: (productId: string) => void;
  add: (product: Product, amount?: number) => AddOrderResult;
  applyMany: (
    items: Array<{ product: Product; requested: number }>,
  ) => { warnings: string[]; addedCount: number; hasPartial: boolean };
}

export function useOrder(products: Product[]): UseOrderReturn {
  const [order, setOrder] = useState<Order>({});

  useEffect(() => {
    setOrder((current) => pruneOrder(current, products));
  }, [products]);

  const add = useCallback(
    (product: Product, amount = 1): AddOrderResult => {
      let outcome: AddOrderResult = { status: "added", added: 0 };
      setOrder((current) => {
        const { next, result } = applyQuantityToOrder(current, product, amount);
        outcome = result;
        return next;
      });
      return outcome;
    },
    [],
  );

  const remove = useCallback((productId: string) => {
    setOrder((current) => decrementOrder(current, productId));
  }, []);

  const clear = useCallback(() => setOrder({}), []);

  const applyMany = useCallback<UseOrderReturn["applyMany"]>(
    (items) => {
      const warnings: string[] = [];
      let addedCount = 0;
      let hasPartial = false;
      setOrder((current) => {
        let next = current;
        for (const { product, requested } of items) {
          const { next: updated, result } = applyQuantityToOrder(next, product, requested);
          next = updated;
          if (result.status === "added" || result.status === "partial") {
            addedCount += 1;
            if (result.status === "partial") {
              hasPartial = true;
              warnings.push(
                `Unidades insuficientes para ${product.name}: adicionado ${result.added} de ${result.requested}.`,
              );
            }
          } else if (result.status === "none") {
            warnings.push(`Sem unidades disponíveis para ${product.name}.`);
          }
        }
        return next;
      });
      return { warnings, addedCount, hasPartial };
    },
    [],
  );

  const total = useMemo(() => orderTotal(order, products), [order, products]);
  const itemCount = useMemo(() => orderItemCount(order), [order]);

  return {
    order,
    total,
    itemCount,
    hasItems: itemCount > 0,
    clear,
    remove,
    add,
    applyMany,
  };
}
