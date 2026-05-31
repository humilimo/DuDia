import { normalizeText } from "./normalizeText";

const WORD_NUMBERS: Record<string, number> = {
  meio: 0.5,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
};

/** Capturing group for quantity tokens in voice regexes. */
export const QTY_WORD_PATTERN =
  "meio|\\d+(?:[.,]\\d+)?|um|uma|dois|duas|tres|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte";

export function parseQuantityToken(token: string): number | null {
  const t = normalizeText(token);
  if (WORD_NUMBERS[t] !== undefined) return WORD_NUMBERS[t];
  const n = parseFloat(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseQuantityPhrase(text: string): number | null {
  const t = normalizeText(text);
  if (WORD_NUMBERS[t] !== undefined) return WORD_NUMBERS[t];
  const m = t.match(/(\d+(?:[.,]\d+)?)/);
  if (m) return parseFloat(m[1].replace(",", "."));
  return null;
}
