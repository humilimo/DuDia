# app/ — Rotas (expo-router)

Esta pasta define **apenas** o roteamento. Não escreva lógica de tela aqui.

## Regras

- Cada arquivo em `app/(tabs)/*.tsx` é um **thin wrapper** que reexporta o componente de `src/features/<feature>/screens/`:

  ```tsx
  import { VendasScreen } from "@/src/features/vendas/screens/VendasScreen";

  export default function VendasTab() {
    return <VendasScreen />;
  }
  ```

- O grupo `(tabs)` define a tab bar (em `_layout.tsx`). Ordem das abas: **Vendas → Produtos → Balanço → Histórico → Perfil**.
- `_layout.tsx` da raiz registra providers globais via `<AppBootstrap>` (de `src/app-shell/`).
- `+not-found.tsx` é a 404 do expo-router; o link de volta deve apontar para `/` (Vendas).
- `typedRoutes` está ligado em [app.json](../app.json); aproveitar autocomplete de `href`.

## Nunca

- Definir styles, hooks de estado ou `useEffect` aqui.
- Importar de `src/lib/` ou `src/features/<x>/components/`. As telas é que cuidam disso.
- Adicionar uma nova rota sem antes criar a feature correspondente em `src/features/`.
