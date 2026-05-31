# src/ — Código da aplicação

Organização por camadas. Quanto mais à direita na lista abaixo, mais "puro" e reutilizável o código.

```
features → components/ui → hooks → lib → theme → types
```

Uma camada só pode importar de camadas à sua direita, **nunca à esquerda**.

## Camadas

### `app-shell/`
Providers globais (`AppBootstrap`, `ThemeProvider`). Só pode ser importado por `app/_layout.tsx`.

### `features/<nome>/`
Uma pasta por aba do app. Estrutura interna detalhada em [features/AGENTS.md](features/AGENTS.md).

### `components/ui/`
Design system. Componentes puros, sem regra de negócio, parametrizados por props e tokens do tema.

- Todos consomem `useTheme()` — nunca cores hardcoded.
- Cada arquivo exporta **um** componente nomeado (`export function Button(...)`).
- Suporte mínimo de a11y: `accessibilityRole`, `accessibilityLabel`, alvo de toque ≥ 48dp em controles interativos.

### `hooks/`
Hooks reutilizáveis cross-feature. Hooks específicos de uma feature ficam em `features/<x>/hooks/`.

### `lib/`
- `domain/`: regras de negócio puras (store, helpers de vendas). Sem JSX.
- `voice/`: parsing pt-BR offline.
- `storage/`: AsyncStorage + settings store.
- `utils/`: helpers diversos (feedback háptico, imagem).

Proibido importar de `react-native`/JSX em `lib/`. Para hooks que envolvem o store, usar `useSyncExternalStore` exportado pelo próprio módulo (ex.: `useStore`).

### `theme/`
- `tokens.ts`: paletas (light + dark), spacing, radius, shadows, typography.
- `ThemeProvider.tsx` + `useTheme()`: provê o tema ativo e seguir `Appearance` ou override manual.
- `fonts.ts`: declaração das fontes Inter carregadas via `expo-font`.

### `types/`
Tipos compartilhados (`Product`, `Sale`, etc). Não exportar implementações.

## Imports

Sempre `@/src/...`. Configurado em [tsconfig.json](../tsconfig.json).

## Estilos

`StyleSheet.create` no fim do arquivo. **Sempre** pegar cores do tema:

```tsx
const { tokens } = useTheme();
const styles = useMemo(() => makeStyles(tokens), [tokens]);
```

Para componentes globais (UI kit), o pattern é uma factory `makeStyles(tokens)` chamada via `useMemo`.

## Acessibilidade

- Botões: `accessibilityRole="button"` + `accessibilityLabel` descritivo.
- Inputs: label visível ou `accessibilityLabel`.
- Tamanho mínimo de toque: 48×48 dp.
- Respeitar `useWindowDimensions().fontScale` — não fixar `lineHeight` em pixels apertados.
