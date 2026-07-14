---
name: ecomzero-senior
description: Engenharia sênior full-stack da loja EcomZero — Next.js 16 (App Router) + React 19 + Tailwind v4 + Prisma 7 (Postgres via Vercel/Neon) + Zod. Use SEMPRE que a tarefa envolver arquivos em ecomzero/ — páginas/rotas em src/app, componentes em src/components, services/actions/validation em src/lib, schema Prisma, carrinho, deploy na Vercel, ou qualquer bug/feature do site ecomzero.com.br. Também acione para revisão de código, decisões de arquitetura, e antes de mexer em qualquer coisa que toque geração estática (Header, layout raiz, home) ou no schema do banco.
---

# EcomZero Senior — loja ecomzero.com.br

Engenheiro full-stack sênior deste projeto específico. Preserva a arquitetura já estabelecida, reusa o que existe, valida sempre antes de reportar pronto.

## Protocolo de contexto (leia nesta ordem, economiza tokens)

1. Leia `references/roadmap-e-decisoes.md` — o que já está pronto, o que é limite deliberado de fase, decisões de produto já tomadas (não redecida o que já foi decidido).
2. Leia `references/arquitetura.md` antes de criar/mudar qualquer arquivo em `src/` — estrutura de pastas, modelo de dados, camadas.
3. Se a tarefa toca `useSearchParams`, `cookies()`, `headers()`, Header, `layout.tsx`, ou qualquer coisa renderizada na home (`/`): leia `references/nextjs-gotchas.md` ANTES de escrever código. Isso já causou regressão real duas vezes neste projeto.
4. Se a tarefa toca `prisma/schema.prisma`, migração, seed, ou deploy: leia `references/infra-e-deploy.md`.
5. Nunca releia o projeto inteiro pra "se situar" — os 4 arquivos acima são a fonte de verdade do estado atual.

## Arquitetura (resumo — detalhe em references/arquitetura.md)

```
ecomzero/
├── prisma/               # schema.prisma, migrations/, seed.ts
├── prisma.config.ts      # config do Prisma 7 (datasource url, comando de seed)
├── src/
│   ├── app/               # SÓ rotas/páginas — zero regra de negócio aqui
│   ├── components/        # UI — nunca importa Prisma nem faz fetch direto a banco
│   ├── lib/
│   │   ├── db.ts           # singleton do Prisma Client (driver adapter @prisma/adapter-pg)
│   │   ├── config.ts       # lê env vars uma vez, exporta tipado (Zod)
│   │   ├── session.ts      # cookie de sessão anônima do carrinho
│   │   ├── services/       # ÚNICA camada que toca Prisma — productService, cartService
│   │   ├── validation/     # schemas Zod para toda entrada externa
│   │   └── actions/        # Server Actions "burras": valida → chama service → revalida
│   ├── types/              # tipos de domínio (Product, Cart...) — NÃO são os tipos do Prisma
│   ├── data/                # só o que é estático de verdade (categorias.json, hero-slides.json)
│   └── generated/prisma/   # client gerado — NUNCA editar, gitignored, regenerado no postinstall
```

## Regras invioláveis

- **Componentes React nunca importam Prisma nem `@/lib/db` diretamente.** Sempre passam por uma função de `lib/services/`.
- **Toda entrada externa (Server Action, route handler) é validada com Zod** antes de chegar no service.
- **Sem controle de estoque, de propósito.** Todo produto/variante cadastrado é sempre considerado disponível. Não adicione campo de quantidade/estoque sem instrução explícita.
- **`/` (home) tem que continuar `○ Static` no output do `next build`.** Qualquer componente renderizado na home que use `useSearchParams()`, `cookies()` ou `headers()` direto quebra isso — ver `references/nextjs-gotchas.md` para o padrão correto (isolar em componente minúsculo + Context).
- **Carrinho = `Order` com `status: "draft"`**, vinculado a `sessionId` (cookie anônimo httpOnly). Ainda sem login, sem checkout, sem frete, sem pagamento — isso é limite deliberado da Fase 2, não esquecimento (ver roadmap).
- **Dois canais de compra coexistem por decisão do dono do produto**: "Adicionar ao carrinho" (site) e "Comprar na Shopee" — nunca remover um em favor do outro sem confirmar.
- **Nunca rode `git commit`/`git push`/`vercel deploy --prod` sem o usuário pedir explicitamente na mensagem atual.** Deploy em produção já foi pedido e feito antes, mas cada deploy é uma autorização nova, não permanente.

## Padrões de código

- TypeScript estrito, sem `any` explícito. Tipo de retorno explícito em toda função de service.
- Tailwind v4 (config via CSS, sem `tailwind.config.js`). Paleta: fundo preto/gradiente vermelho-escuro (`#090101`/`#230505`), verde de marca `#A9EC17` (links/badges/nav ativo) e `#B8E82E` (CTAs primários de compra) — não inventar cor nova fora dessa paleta.
- Ícones: `lucide-react`. Reusar componente existente (ex.: `ProductCard`, `CartBadgeCount`) antes de criar um novo.
- Efeitos: nunca `setState` síncrono direto no corpo de um `useEffect` — ESLint (`react-hooks/set-state-in-effect`) já pegou isso 3 vezes neste projeto. Ver padrão de correção em `references/nextjs-gotchas.md`.
- Sem toast/alert() — feedback inline no próprio elemento (estado de pending/sucesso no botão).

## Workflow

1. **Diagnostique primeiro** se a tarefa é ambígua ou envolve decisão de produto (ex.: mudar fluxo de compra, adicionar dado que não existe no schema). Pergunte antes de assumir — este projeto já teve retrabalho por assumir errado.
2. **Implemente** o mínimo que resolve, seguindo a arquitetura acima.
3. **Valide (obrigatório antes de reportar pronto):**

```bash
cd ecomzero
npx tsc --noEmit
npx eslint .
npm run build        # confira a tabela de rotas: "/" tem que ser ○ Static
```

Se mudou schema: rode a migração local (ver `references/infra-e-deploy.md` para o fluxo não-interativo) e regenere o client (`npx prisma generate`).

Se não há navegador disponível para clicar de verdade: diga isso explicitamente no relatório em vez de alegar que testou a UI. Teste o que der pra testar sem navegador — script direto contra o service (`npx tsx --env-file=.env`), curl no build de produção local (`next build && next start`) checando o HTML renderizado.

4. **Atualize os arquivos desta skill (obrigatório se mudou arquitetura, adicionou padrão novo, ou fechou/abriu uma fase do roadmap).** Sem isso a próxima sessão redescobre tudo do zero. Edite o arquivo de `references/` relevante — não deixe informação desatualizada.

## Relatório (conciso)

```
Arquivos modificados: [arquivo — o que mudou, 1 linha cada]
Validação: tsc ✓ | eslint ✓ | build ✓ (/ estático: sim/não) | teste funcional: [o que rodou, ou "não testado — sem navegador"]
Skill atualizada: ✓ (arquivo) | não necessário
Pendências: [decisão necessária do usuário, ou "nenhuma"]
```

Git: nunca commite/push sem pedido explícito na mensagem atual. Deploy em produção: mesma regra.
