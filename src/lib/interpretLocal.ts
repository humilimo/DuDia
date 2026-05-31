import { normalizeText as norm } from "./normalizeText";
import { parseQuantityPhrase, parseQuantityToken, QTY_WORD_PATTERN } from "./parseQuantity";
import type { Product } from "./types";

export type VoiceScreen = "vendas" | "produtos";

export interface VoiceAction {
  action:
    | "sale_amount"
    | "adjust_amount"
    | "sale_with_product"
    | "register_product"
    | "stock_add"
    | "stock_remove"
    | "unknown";
  value?: number;
  quantity?: number;
  product_id?: string;
  product_name?: string;
  product_price?: number;
  product_unit?: string;
  product_stock?: number;
  message?: string;
}

function parseUnit(text: string): "kg" | "un" {
  const t = norm(text);
  if (/\b(un|unidade|und)\b/.test(t)) return "un";
  return "kg";
}

function findProduct(nameHint: string, products: Product[]): Product | undefined {
  const target = norm(nameHint);
  if (!target) return undefined;
  const exact = products.find((p) => norm(p.name) === target);
  if (exact) return exact;
  const includes = products.find(
    (p) => norm(p.name).includes(target) || target.includes(norm(p.name)),
  );
  return includes;
}

function extractProductNameFromTail(tail: string, products: Product[]): {
  product?: Product;
  name?: string;
} {
  const cleaned = tail
    .replace(/\b(de|do|da|no|na|o|a)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return {};
  const found = findProduct(cleaned, products);
  if (found) return { product: found, name: found.name };
  return { name: cleaned };
}

export function interpretCommandLocal(transcript: string, products: Product[]): VoiceAction {
  const raw = transcript.trim();
  const t = norm(raw);

  if (!t) return { action: "unknown", message: "Não ouvi nada" };

  const qtyCapture = `(${QTY_WORD_PATTERN})`;

  // --- Cadastrar produto ---
  const registerMatch = raw.match(
    new RegExp(
      `cadastr(?:ar|e|o)?\\s+(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*reais?(?:\\s+(?:o\\s+|a\\s+)?(quilo|kg|unidade|un))?(?:\\s+(${QTY_WORD_PATTERN})\\s*(quilos?|kg|unidades?|un)?)?`,
      "i",
    ),
  );
  if (registerMatch) {
    const name = registerMatch[1].trim();
    const price = parseFloat(registerMatch[2].replace(",", "."));
    const unit = registerMatch[3] ? parseUnit(registerMatch[3]) : "kg";
    const stock = registerMatch[4] ? parseQuantityToken(registerMatch[4]) : undefined;
    if (name && price > 0) {
      return {
        action: "register_product",
        product_name: name,
        product_price: price,
        product_unit: unit,
        product_stock: stock && stock > 0 ? stock : undefined,
      };
    }
  }

  // --- Estoque: adicionar ---
  const stockAddMatch = t.match(
    /^(?:adicionar|adiciona|coloca|entrada)\s+(.+)$/,
  );
  if (stockAddMatch) {
    const rest = stockAddMatch[1];
    const qtyMatch = rest.match(
      new RegExp(
        `^${qtyCapture}\\s*(quilos?|kg|unidades?|un)?\\s*(?:de\\s+)?(.+)$`,
        "i",
      ),
    );
    if (qtyMatch) {
      const qty = parseQuantityToken(qtyMatch[1]);
      const { product, name } = extractProductNameFromTail(qtyMatch[3], products);
      if (qty && qty > 0 && (product || name)) {
        return {
          action: "stock_add",
          quantity: qty,
          product_id: product?.id,
          product_name: product?.name ?? name,
        };
      }
    }
  }

  // --- Estoque: tirar ---
  const stockRemoveMatch = t.match(
    /^(?:tirar|remove|remover|sai)\s+(.+)$/,
  );
  if (stockRemoveMatch) {
    const rest = stockRemoveMatch[1];
    const qtyMatch = rest.match(
      new RegExp(`^${qtyCapture}\\s*(?:do\\s+estoque\\s+)?(?:de\\s+)?(.+)$`, "i"),
    );
    if (qtyMatch) {
      const qty = parseQuantityToken(qtyMatch[1]);
      const { product, name } = extractProductNameFromTail(qtyMatch[2], products);
      if (qty && qty > 0 && (product || name)) {
        return {
          action: "stock_remove",
          quantity: qty,
          product_id: product?.id,
          product_name: product?.name ?? name,
        };
      }
    }
  }

  // --- Ajuste negativo (tirar valor) ---
  const adjustMatch = t.match(
    /^(?:tirar|menos|desconto|ajuste|diminui)\s+(\d+(?:[.,]\d+)?)\s*(?:reais?)?$/,
  );
  if (adjustMatch) {
    const value = parseFloat(adjustMatch[1].replace(",", "."));
    if (value > 0) return { action: "adjust_amount", value };
  }

  // --- Venda com produto: valor em reais ---
  const saleValueMatch = raw.match(
    /(?:vendi|venda|vender|de)?\s*(\d+(?:[.,]\d+)?)\s*reais?\s+(?:de\s+)?(.+)/i,
  );
  if (saleValueMatch) {
    const value = parseFloat(saleValueMatch[1].replace(",", "."));
    const { product, name } = extractProductNameFromTail(saleValueMatch[2], products);
    if (value > 0 && (product || name)) {
      return {
        action: "sale_with_product",
        value,
        product_id: product?.id,
        product_name: product?.name ?? name,
      };
    }
  }

  // --- Venda: quantidade + unidade + produto ---
  const saleQtyMatch = raw.match(
    new RegExp(
      `(?:vendi|venda|vender)?\\s*${qtyCapture}\\s*(quilos?|kg|unidades?|un)?\\s*(?:de\\s+)?(.+)`,
      "i",
    ),
  );
  if (saleQtyMatch) {
    const qty = parseQuantityToken(saleQtyMatch[1]);
    const { product, name } = extractProductNameFromTail(saleQtyMatch[3], products);
    if (qty && qty > 0 && (product || name)) {
      return {
        action: "sale_with_product",
        quantity: qty,
        product_id: product?.id,
        product_name: product?.name ?? name,
      };
    }
  }

  // --- Venda: só valor (sem produto) ---
  const amountOnlyMatch = t.match(
    /^(?:vendi|venda|vender)?\s*(\d+(?:[.,]\d+)?)\s*reais?$/,
  );
  if (amountOnlyMatch) {
    const value = parseFloat(amountOnlyMatch[1].replace(",", "."));
    if (value > 0) return { action: "sale_amount", value };
  }

  // --- Venda: "produto X reais" ---
  const productFirstMatch = raw.match(
    /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*reais?$/i,
  );
  if (productFirstMatch) {
    const value = parseFloat(productFirstMatch[2].replace(",", "."));
    const { product, name } = extractProductNameFromTail(productFirstMatch[1], products);
    if (value > 0 && (product || name)) {
      return {
        action: "sale_with_product",
        value,
        product_id: product?.id,
        product_name: product?.name ?? name,
      };
    }
  }

  // --- Tentativa genérica: número + "de" + produto ---
  const genericSale = raw.match(
    new RegExp(`(${QTY_WORD_PATTERN})\\s*(?:reais?|real)?\\s*(?:de\\s+)?(.+)`, "i"),
  );
  if (genericSale) {
    const num = parseQuantityPhrase(genericSale[1]);
    const { product, name } = extractProductNameFromTail(genericSale[2], products);
    if (num && num > 0 && (product || name)) {
      if (/\b(quilo|kg|un)\b/i.test(genericSale[0]) && !/\breais?\b/i.test(genericSale[0])) {
        return {
          action: "sale_with_product",
          quantity: num,
          product_id: product?.id,
          product_name: product?.name ?? name,
        };
      }
      return {
        action: "sale_with_product",
        value: num,
        product_id: product?.id,
        product_name: product?.name ?? name,
      };
    }
  }

  return {
    action: "unknown",
    message: "Não entendi. Tente: vendi 5 reais de tomate",
  };
}

function isActionKnown(act: VoiceAction): boolean {
  return act.action !== "unknown";
}

function splitTranscriptIntoSegments(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const byDelimiter = trimmed
    .split(/\s*,\s*|\s*;\s*|\s+e\s+|\s+tambem\s+|\s+também\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (byDelimiter.length > 1) return byDelimiter;

  const qtyStart = new RegExp(
    `(?:^|\\s)(?:vendi|venda|vender)?\\s*(${QTY_WORD_PATTERN})\\s*(?:quilos?|kg|unidades?|un)?\\s*(?:de\\s+)?`,
    "gi",
  );
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = qtyStart.exec(trimmed)) !== null) {
    starts.push(m.index + (m[0].startsWith(" ") ? 1 : 0));
  }

  if (starts.length <= 1) return [trimmed];

  const segments: string[] = [];
  for (let i = 0; i < starts.length; i++) {
    const end = starts[i + 1] ?? trimmed.length;
    const chunk = trimmed.slice(starts[i], end).trim();
    if (chunk) segments.push(chunk);
  }
  return segments;
}

function applyScreenContext(act: VoiceAction, screen: VoiceScreen): VoiceAction {
  if (screen === "vendas") return act;

  switch (act.action) {
    case "sale_with_product":
      return {
        action: "stock_add",
        quantity: act.quantity,
        value: act.value,
        product_id: act.product_id,
        product_name: act.product_name,
      };
    case "stock_remove":
    case "adjust_amount":
    case "sale_amount":
      return {
        action: "unknown",
        message: "Na tela Produtos use: adiciona 2 quilos de tomate",
      };
    default:
      return act;
  }
}

export function interpretCommands(
  transcript: string,
  products: Product[],
  screen: VoiceScreen,
): VoiceAction[] {
  const raw = transcript.trim();
  if (!raw) return [{ action: "unknown", message: "Não ouvi nada" }];

  const segments = splitTranscriptIntoSegments(raw);
  const actions: VoiceAction[] = [];

  for (const segment of segments) {
    const act = applyScreenContext(interpretCommandLocal(segment, products), screen);
    if (isActionKnown(act)) actions.push(act);
  }

  if (actions.length > 0) return actions;

  const full = applyScreenContext(interpretCommandLocal(raw, products), screen);
  return isActionKnown(full) ? [full] : [full];
}
