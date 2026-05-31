# features/ — Uma pasta por funcionalidade

Cada aba/área principal vira uma feature isolada. Hoje: `vendas`, `produtos`, `balanco`, `historico`, `perfil`.

## Estrutura padrão

```
features/<nome>/
  screens/<Nome>Screen.tsx        # Composição. Idealmente < 200 linhas
  components/                     # Componentes só usados por esta feature
  hooks/                          # Hooks só usados por esta feature
  logic/                          # Funções puras de regra de UI (cálculos, formatação)
```

## Regras

- **Telas devem ser finas.** Toda lógica vai para `hooks/` ou `logic/`. Se passar de ~200 linhas, refatorar.
- **Sem imports cruzados** entre features. Se duas features compartilham algo, sobe para `src/components/ui/`, `src/hooks/` ou `src/lib/domain/`.
- **Acesso ao store**: via `useStore()` e `store.*` de `@/src/lib/domain/store`. Nunca tocar `AsyncStorage` direto.
- **Voz**: usar `useSpeech` (hook global) + `interpretCommands(transcript, products, mode)` onde `mode = "vendas" | "produtos"`. A separação de regras (vendas vs produtos) é feita pelo `mode`, não pelo consumidor.

## Telas atuais

| Feature | Responsabilidade |
|---|---|
| `vendas` | Listar produtos, montar pedido (manual/voz), checkout com pagamento |
| `produtos` | CRUD de produtos, ajuste de estoque, cadastro por voz/manual |
| `balanco` | Resumo por período (hoje/7/15/30/dia) com totais e itens vendidos |
| `historico` | Vendas agrupadas por dia, drill-down em itens e pagamento |
| `perfil` | Identificação, preferências (vibração, tema), tutoriais, reset |
