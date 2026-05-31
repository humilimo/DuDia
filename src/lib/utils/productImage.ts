const EMOJI_MAP: Record<string, string> = {
  tomate: "🍅",
  banana: "🍌",
  maca: "🍎",
  maçã: "🍎",
  laranja: "🍊",
  limao: "🍋",
  limão: "🍋",
  uva: "🍇",
  morango: "🍓",
  abacaxi: "🍍",
  manga: "🥭",
  melancia: "🍉",
  pera: "🍐",
  abacate: "🥑",
  cenoura: "🥕",
  batata: "🥔",
  milho: "🌽",
  pimentao: "🫑",
  pimentão: "🫑",
  cebola: "🧅",
  alho: "🧄",
  alface: "🥬",
  couve: "🥬",
  brocolis: "🥦",
  brócolis: "🥦",
  pepino: "🥒",
  berinjela: "🍆",
  ovo: "🥚",
  pao: "🍞",
  pão: "🍞",
  queijo: "🧀",
  leite: "🥛",
  feijao: "🫘",
  feijão: "🫘",
  arroz: "🍚",
  coco: "🥥",
  mamao: "🥭",
  mamão: "🥭",
  cogumelo: "🍄",
};

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getProductEmoji(name: string): string | null {
  const n = norm(name);
  if (EMOJI_MAP[n]) return EMOJI_MAP[n];
  for (const key of Object.keys(EMOJI_MAP)) {
    if (n.includes(key) || key.includes(n)) return EMOJI_MAP[key];
  }
  return null;
}

export function getProductImageUrl(name: string): string {
  const clean = encodeURIComponent(name.trim());
  return `https://image.pollinations.ai/prompt/${clean}%20fresh%20produce%20isolated%20on%20white%20background%20product%20photo?width=128&height=128&nologo=true`;
}
