import {
  interpretCommandLocal,
  interpretCommands as interpretCommandsLocal,
  type VoiceAction,
  type VoiceScreen,
} from "./interpretLocal";
import { store, getProductById } from "@/src/lib/domain/store";
import type { Product } from "@/src/types";

export type { VoiceAction, VoiceScreen };

export interface ProcessResult {
  ok: boolean;
  label: string;
  kind: "ok" | "err" | "warn";
}

export function interpretCommand(
  transcript: string,
  products: Product[],
): Promise<VoiceAction> {
  return Promise.resolve(interpretCommandLocal(transcript, products));
}

export function interpretCommands(
  transcript: string,
  products: Product[],
  screen: VoiceScreen,
): Promise<VoiceAction[]> {
  return Promise.resolve(interpretCommandsLocal(transcript, products, screen));
}

export function applyProductsVoice(act: VoiceAction): ProcessResult {
  if (act.action === "stock_remove") {
    return err("Na tela Produtos só é possível adicionar estoque");
  }

  let normalized = act;
  if (act.action === "sale_with_product") {
    normalized = {
      action: "stock_add",
      quantity: act.quantity,
      value: act.value,
      product_id: act.product_id,
      product_name: act.product_name,
    };
  }

  if (normalized.action === "stock_add" && !normalized.quantity && normalized.value) {
    const p = normalized.product_id
      ? getProductById(normalized.product_id)
      : normalized.product_name
        ? store.findProductByName(normalized.product_name)
        : undefined;
    if (p && p.price > 0) {
      normalized = {
        ...normalized,
        quantity: +(normalized.value / p.price).toFixed(3),
      };
    }
  }

  return applyAction(normalized);
}

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export function applyAction(act: VoiceAction): ProcessResult {
  switch (act.action) {
    case "sale_amount":
      return { ok: false, label: "Diga o produto também", kind: "err" };
    case "adjust_amount": {
      const v = -Math.abs(act.value || 0);
      if (!v) return err("Valor inválido");
      store.addSale({ value: v, label: `${fmt(v)}` });
      return ok(`${fmt(v)}`);
    }
    case "sale_with_product": {
      const product = act.product_id
        ? getProductById(act.product_id)
        : act.product_name
          ? store.findProductByName(act.product_name)
          : undefined;
      if (!product) {
        const pname = act.product_name || "esse produto";
        return err(`${pname} não encontrado`);
      }
      let value = act.value ?? 0;
      let qty = act.quantity ?? 0;
      if (value && !qty) qty = +(value / product.price).toFixed(3);
      else if (qty && !value) value = +(qty * product.price).toFixed(2);
      if (!value || !qty) return err("Comando incompleto");
      if (product.stock <= 0) return err(`Sem estoque de ${product.name}`);
      if (qty > product.stock + 0.001) return err("Estoque insuficiente");
      store.addSale({
        value,
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unit: product.unit,
        label: `+ ${fmt(value)} ${product.name}`,
      });
      return { ok: true, label: `+ ${fmt(value)} ${product.name}`, kind: "ok" };
    }
    case "register_product": {
      if (!act.product_name || !act.product_price) return err("Faltou nome ou preço");
      const p = store.addProduct({
        name: act.product_name,
        price: act.product_price,
        unit: act.product_unit || "kg",
        stock: act.product_stock && act.product_stock > 0 ? act.product_stock : 0,
      });
      return ok(`${p.name} cadastrado`);
    }
    case "stock_add": {
      const p = act.product_id
        ? getProductById(act.product_id)
        : act.product_name
          ? store.findProductByName(act.product_name)
          : undefined;
      if (!p) return err("Produto não encontrado");
      const q = act.quantity ?? 0;
      if (!q) return err("Quantidade inválida");
      store.adjustStock(p.id, q);
      return ok(`+${q}${p.unit} ${p.name}`);
    }
    case "stock_remove": {
      const p = act.product_id
        ? getProductById(act.product_id)
        : act.product_name
          ? store.findProductByName(act.product_name)
          : undefined;
      if (!p) return err("Produto não encontrado");
      const q = act.quantity ?? 0;
      if (!q) return err("Quantidade inválida");
      store.adjustStock(p.id, -q);
      return { ok: true, label: `-${q}${p.unit} ${p.name}`, kind: "ok" };
    }
    default:
      return err(act.message || "Não entendi");
  }
}

function ok(label: string): ProcessResult {
  return { ok: true, label, kind: "ok" };
}
function err(label: string): ProcessResult {
  return { ok: false, label, kind: "err" };
}
