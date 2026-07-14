# Gotchas reais — já causaram bug neste projeto, não repita

## 1. Dynamic APIs derrubam a geração estática da home — aconteceu 2 vezes

**O que é uma "Dynamic API"**: `useSearchParams()` (client), `cookies()` e `headers()` (server). Qualquer componente que chama uma dessas, em QUALQUER lugar da árvore renderizada em `/`, força a rota inteira a sair de `○ Static` e virar `ƒ Dynamic` (server-rendered a cada request). Isso mata cache de CDN e é ruim pra SEO (a home é a página mais importante pra isso).

**`useSearchParams()` especificamente**: exige um `<Suspense>` ancestral. Durante a geração estática, o Next **sempre** usa o *fallback* desse Suspense no HTML — nunca tenta renderizar com params vazios, porque a mesma página estática precisa servir qualquer query string. Ou seja: **tudo que estiver dentro desse Suspense some do HTML estático**, não só o texto que depende do param.

**Incidente #1** (auditoria de SEO): `Showcase.tsx` e `CategoryStrip.tsx` chamavam `useSearchParams()` direto pra ler `?cat=`. A grade inteira de produtos e os links de categoria sumiam do HTML puro (confirmado com `curl` + `next build && next start` — só JS-rendering mostrava o conteúdo).

**Incidente #2** (durante a Fase 2, carrinho): botei o badge de contagem do carrinho lendo `cookies()` direto dentro de `Header.tsx` (Server Component). `Header` é renderizado no `layout.tsx` raiz — presente em TODA página, incluindo `/`. Isso sozinho já bastou pra `/` virar dinâmica de novo.

### O padrão de correção (use sempre que precisar ler algo "dinâmico" numa página que deve ficar estática)

Isole a chamada da Dynamic API num componente **minúsculo, sem saída visual**, dentro do seu próprio `<Suspense fallback={null}>`, e propague o valor via **React Context** pros componentes irmãos que realmente precisam mostrar algo. Exemplo real (`ProductFiltersProvider.tsx`):

```tsx
"use client";
function CategoryFilterSync({ onChange }: { onChange: (cat: string | null) => void }) {
  const searchParams = useSearchParams();   // única chamada dessa API na árvore
  const cat = searchParams.get("cat");
  useEffect(() => { onChange(cat); }, [cat, onChange]);
  return null;                              // sem saída visual — o fallback congelado não perde nada
}

export function ProductFiltersProvider({ children }) {
  const [cat, setCat] = useState<string | null>(null);   // default = estado que a home mostra sem JS
  return (
    <Context.Provider value={cat}>
      <Suspense fallback={null}><CategoryFilterSync onChange={setCat} /></Suspense>
      {children}   {/* renderiza cheio via SSR, com o valor padrão */}
    </Context.Provider>
  );
}
```

Pra `cookies()` no caso do carrinho, o padrão foi diferente (cookie não tem equivalente ao Context-bridge de searchParams porque `Header` não pode "esperar" um Suspense de servidor pro cookie): a leitura foi movida pra **dentro de uma Server Action**, chamada do client via `useEffect` depois da montagem (`CartProvider.tsx` chama `getCartSummaryAction()` no mount). Server Actions rodam sob demanda — não afetam a classificação estática/dinâmica de nenhuma rota, porque não fazem parte da renderização da página em si.

**Sempre que mexer em `Header.tsx`, `layout.tsx`, ou qualquer coisa renderizada em `/`: rode `npm run build` depois e confira a tabela de rotas — `/` tem que continuar `○ (Static)`.** Se virou `ƒ (Dynamic)`, algo na árvore está chamando uma Dynamic API direto.

`usePathname()` **não** é uma Dynamic API — pode usar à vontade (é o que `BottomNav.tsx` usa pra saber a aba ativa) sem medo de quebrar a estática.

## 2. Prisma 7 — formato novo, não é o Prisma 5/6 que você conhece

- `schema.prisma` **não tem mais** `url = env("DATABASE_URL")` no bloco `datasource`. A URL vem de `prisma.config.ts`:
  ```ts
  export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
    datasource: { url: process.env["DATABASE_URL"] },
  });
  ```
- Client gerado vai pra `src/generated/prisma` (não `node_modules/.prisma/client`), gitignored, regenerado via `npx prisma generate` (rodado automaticamente no `postinstall`).
- Runtime usa **driver adapter** (`@prisma/adapter-pg`), não o engine bundlado clássico:
  ```ts
  import { PrismaPg } from "@prisma/adapter-pg";
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  export const prisma = new PrismaClient({ adapter });
  ```
- Tipo de payload com relations: use `OrderGetPayload<{ include: typeof algumInclude }>` importado de `@/generated/prisma/models` (não dá pra derivar via `ReturnType<typeof prisma.order.findUnique<...>>` — não compila no client novo).

### `prisma migrate dev` não funciona neste ambiente (precisa de TTY interativo)

Se você não tem terminal interativo (agente/CI), `migrate dev` falha com "non-interactive environment". Fluxo alternativo, sempre que precisar criar uma migração:

```bash
# 1. Gera o SQL da diferença (não aplica ainda)
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_nome_da_mudanca
npx prisma migrate diff \
  --from-config-datasource prisma.config.ts \
  --to-schema prisma/schema.prisma \
  --script > prisma/migrations/TIMESTAMP_nome_da_mudanca/migration.sql

# 2. Confira o SQL manualmente antes de aplicar

# 3. Aplica de forma não-interativa
npx prisma migrate deploy

# 4. Regenera o client
npx prisma generate
```

Cuidado com comandos `mkdir`/timestamp em duas etapas na mesma linha de shell — já rolou de criar uma pasta de migração vazia por engano (timestamp calculado duas vezes com valores diferentes). Sempre confira `ls prisma/migrations/` depois e apague pasta vazia + a linha correspondente na tabela `_prisma_migrations` do banco antes de seguir.

## 3. `react-hooks/set-state-in-effect` (ESLint) — já pegou 3 vezes

A regra proíbe `setState` síncrono direto no corpo de um `useEffect`. Já apareceu em: `HeroShowcase.tsx` (sincronizar índice do slide do Embla), `MobileMenu.tsx` (flag de "já montei, pode abrir portal"), `ProductPurchase.tsx` (resetar feedback ao trocar de variante).

**Padrões de correção que já funcionaram:**

- **Ler estado externo mutável reativamente** (ex.: "qual slide está selecionado no Embla", "já passamos da hidratação"): troque `useState` + `useEffect(() => setState(...))` por `useSyncExternalStore`:
  ```tsx
  const selectedIndex = useSyncExternalStore(
    (onChange) => { emblaApi.on("select", onChange); return () => emblaApi.off("select", onChange); },
    () => emblaApi?.selectedScrollSnap() ?? 0,
    () => 0,   // snapshot do server — sempre 0, sem mismatch de hidratação
  );
  ```
- **Resetar um estado quando outro estado muda por causa de uma interação do usuário** (ex.: resetar feedback "Adicionado ✓" ao trocar de variante): não uses um `useEffect` ouvindo a mudança — resete direto no handler do evento que causa a mudança:
  ```tsx
  const handleSelectVariant = (id) => { setSelectedId(id); setFeedback("idle"); };  // não um useEffect([selectedId])
  ```
- Efeito com `setTimeout`/fetch assíncrono dentro (ex.: esconder o "Adicionado ✓" depois de 2.5s, ou buscar o resumo do carrinho no mount) **não** é flagado pela regra — só pega chamada síncrona direta no corpo do effect. Esses continuam normais.

## 4. `apps/admin` faz `tsc --noEmit`/`eslint .` da raiz falharem se não excluído

Desde que `apps/admin` (painel administrativo, projeto Next.js isolado — ver `arquitetura.md`) passou a existir dentro do repo, rodar `npx tsc --noEmit` ou `npx eslint .` **na raiz** varre também `apps/admin/src/**` e até `apps/admin/.next/**` (build artifacts, tipo `webpack-runtime.js`) — cheio de erros que não são do projeto raiz. O `tsconfig.json` da raiz precisa de `"apps"` em `exclude`, e o `eslint.config.mjs` da raiz precisa de `"apps/**"` em `ignores`. `apps/admin` valida com seu próprio `cd apps/admin && npx tsc --noEmit && npm run lint`, separado.

## 5. Regex com `\uXXXX` em edições — cuidado com o encoding

Ao escrever um regex tipo `/[̀-ͯ]/` (remover diacríticos) via ferramenta de edição, o texto às vezes chega no arquivo como caracteres literais combinantes (bytes UTF-8 de verdade) em vez do texto `̀-ͯ` — funciona igual em runtime (mesmo código-ponto), mas é ilegível/arriscado no source. Depois de escrever um regex assim, confira com `grep -n "replace(/" arquivo | cat -A` — se aparecer sequência `M-...` estranha em vez de `̀-ͯ` literal, corrija.
