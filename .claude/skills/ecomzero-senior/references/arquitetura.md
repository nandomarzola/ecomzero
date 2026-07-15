# Arquitetura — EcomZero

## Stack

- **Framework**: Next.js 16.2.10, App Router. Dev roda com `next dev --webpack`; build de produção usa Turbopack.
- **UI**: React 19, Tailwind v4 (config via CSS em `globals.css`, sem `tailwind.config.js`), `lucide-react` para ícones, `embla-carousel-react` no hero.
- **Dados**: Prisma 7.8 + Postgres (Vercel "Prisma Postgres", backend real é `db.prisma.io`). Driver adapter `@prisma/adapter-pg` (conexão TCP direta, NÃO usa Prisma Accelerate).
- **Validação**: Zod em toda entrada externa (Server Actions, params de rota).
- **Lint**: ESLint 9, flat config (`eslint.config.mjs`), `eslint-config-next` pinado na mesma versão do `next`.

## Monorepo-lite: `apps/admin`

O repo `ecomzero` (raiz) É a vitrine/storefront — não foi movida pra dentro de nenhuma subpasta. `apps/admin/` é um projeto Next.js **totalmente isolado** (próprio `package.json` — `"ecomzero-admin"` —, próprio `node_modules`, próprio `tsconfig.json`, próprio `eslint.config.mjs`) que vive dentro do mesmo repositório git só pra conveniência de deploy/organização. Ele NÃO compartilha `src/lib`, Prisma client, nem build/lint com a raiz — é o painel administrativo do ecommerce (MVP, sem backend ainda), diferente do EcomZero Hub (`projeto-ecomzero-hub`, projeto separado).

Por isso o `tsconfig.json` e o `eslint.config.mjs` da raiz têm `apps` no `exclude`/`ignores` — sem isso, `tsc --noEmit`/`eslint .` na raiz varrem (e falham em) os arquivos e build artifacts do `apps/admin`, que já tem seu próprio lint (`cd apps/admin && npm run lint`).

## Árvore de pastas (o que importa, dentro da raiz — a vitrine)

```
src/app/
├── layout.tsx                 # RootLayout — Header, CartProvider, BottomNav, Footer
├── page.tsx                   # Home (Server Component, ○ Static)
├── carrinho/page.tsx          # Carrinho (ƒ Dynamic — lê cookie de sessão)
├── produto/[slug]/page.tsx    # Página de produto (ƒ Dynamic — busca no banco por slug)
├── api/feed/route.ts          # Feed XML pro Meta Commerce Manager (○ Static, gerado no build)
├── api/admin/sync-catalog/route.ts  # Recebe catálogo do Hub (ver seção própria abaixo)
├── api/shipping/quote/route.ts      # Cotação de frete via Melhor Envio (ver seção própria abaixo)
├── sitemap.ts / robots.ts

src/components/
├── Header.tsx                 # Server Component puro — NUNCA leia cookies() aqui (ver gotchas)
├── BottomNav.tsx               # Nav fixa mobile (usePathname — seguro, não força dinâmico)
├── CartProvider.tsx            # Context client-side do contador do carrinho (hidratado via Server Action)
├── CartBadgeCount.tsx           # Badge isolado que lê o Context acima
├── ProductFiltersProvider.tsx  # Context de categoria (?cat=) + busca — isola o único useSearchParams()
│                                # montado em layout.tsx (global) — a busca mora no Header (estilo Casas
│                                # Bahia, só desktop) e precisa do mesmo contexto que o Showcase usa na home
├── SearchBar.tsx                # Busca client-side (filtra por nome, sem backend novo)
├── CategoryStrip.tsx / Showcase.tsx / ProductCard.tsx / HeroShowcase.tsx / FeatureBar.tsx
├── ProductPurchase.tsx          # Página de produto: "Adicionar ao carrinho" + "Comprar na Shopee"
├── HeaderCepButton.tsx          # botão "Informe seu CEP" no Header + dropdown (localStorage, ver seção frete)
├── CepCaptureModal.tsx          # modal de captura de CEP na home (só visitante deslogado, 1x por navegador)
├── CartItemRow.tsx              # Linha de item no /carrinho — truncate no título (já causou bug de layout)
├── RelatedProductsCarousel.tsx  # Carrossel "também pode te interessar" — usa ProductCard layout="grid"
└── PaymentBadges.tsx            # Selos de pagamento decorativos (texto, não logo — ver roadmap)

src/lib/
├── db.ts                # singleton PrismaClient + PrismaPg adapter
├── config.ts             # valida env vars com Zod, exporta `config` tipado
├── session.ts             # getCartSessionId() (leitura) / getOrCreateCartSessionId() (escreve cookie — só em Server Action)
├── services/
│   ├── productService.ts   # getAllProducts, getProductBySlug, getRelatedProducts, getOtherProducts, findCategoryLabel
│   ├── cartService.ts       # getCart, addItem, updateItemQuantity, removeItem — ÚNICA camada que toca Prisma pro carrinho
│   ├── shippingService.ts   # calculateShipping(variantId, cep) — ÚNICA camada que toca Prisma/API do Melhor Envio
│   └── melhorEnvioAuthService.ts # getValidAccessToken() — OAuth de PRODUÇÃO, renova access_token via refresh_token (singleton MelhorEnvioCredential)
├── validation/
│   ├── product.ts (slug), cart.ts (addToCart/updateCartItem/removeCartItem), shipping.ts (cep, variantId)
└── actions/
    └── cartActions.ts   # addToCartAction, updateCartItemAction, removeCartItemAction, getCartSummaryAction

src/types/
├── product.ts   # Product, ProductVariant (domínio — NÃO é o tipo gerado pelo Prisma)
└── cart.ts       # Cart, CartItem

src/data/
├── categorias.json    # categorias + relacionadas (estático de verdade)
└── hero-slides.json    # conteúdo de marketing do carrossel (curado à mão, não é dado de produto)

src/generated/prisma/   # client Prisma gerado — gitignored, NUNCA editar, regenerado via `prisma generate`
```

`src/data/produtos.json` ainda existe só como fonte histórica do `prisma/seed.ts` (migração one-time pro banco) — não é mais lido por nenhuma página/componente.

## Modelo de dados (prisma/schema.prisma)

```prisma
model Product {
  id, slug (unique), categoria, nome, subtitulo, descricao, imagem,
  imagens String[], caracteristicas String[], linkShopee, ativo (default true),
  createdAt, updatedAt
  variantes ProductVariant[]
}

model ProductVariant {
  id, productId (FK), label, precoDe Decimal(10,2), precoPor Decimal(10,2),
  skuInterno String?, linkShopee String?  // sem estoque, de propósito
  pesoKg Float (default 0.3), alturaCm Float (default 4),
  larguraCm Float (default 16), comprimentoCm Float (default 11)
  // ↑ pacote pequeno genérico — ninguém cadastra peso/dimensão real ainda,
  // editável produto a produto depois (usado pelo shippingService)
  orderItems OrderItem[]
}

model Order {              // = carrinho hoje (status "draft"); vira pedido de verdade na Fase 3+
  id, status (default "draft"), sessionId String? @unique, total Decimal(10,2) (default 0),
  createdAt
  items OrderItem[]
}

model OrderItem {
  id, orderId (FK), variantId (FK), quantidade Int, precoUnitario Decimal(10,2)
  @@unique([orderId, variantId])   // adicionar de novo incrementa, não duplica linha
}
```

`precoUnitario` no `OrderItem` é um **snapshot** do preço no momento em que o item foi adicionado — não muda se o preço do produto mudar depois. `cartService.toCart()` também busca `precoDe` (não snapshot, sempre o atual da variante) só para exibir o risco "De/Por" no carrinho.

## Camadas — regra de dependência

`app/` (rotas) → `lib/actions/` (Server Actions, "burras") → `lib/services/` (regra de negócio, única camada Prisma) → `lib/db.ts` (Prisma Client)

`components/` nunca pula direto pra `lib/db.ts` ou `lib/services/` com Prisma — Client Components chamam Server Actions; Server Components (páginas) chamam `lib/services/` diretamente.

Mapeamento Prisma → domínio (`Decimal` → `number`, etc.) acontece DENTRO do service (`toCart()`, `toProduct()`) — o resto do app nunca vê um tipo do Prisma.

## Sincronização de catálogo com o Hub (projeto-ecomzero-hub)

`POST /api/admin/sync-catalog` (`src/app/api/admin/sync-catalog/route.ts`) recebe o catálogo empurrado pelo admin do Hub (`profittrack-front` → tela "Sincronizar Loja"). Autenticação: header `Authorization: Bearer <STOREFRONT_SYNC_API_KEY>`, validada contra `config.storefrontSyncApiKey` (opcional no schema — sem ela configurada, o endpoint recusa TUDO com 503, não derruba o app). Payload validado em `src/lib/validation/sync.ts`; `src/lib/services/productService.ts::syncProductsFromHub()` faz upsert por `slug` (produto) e por `skuInterno`/`label` (variante) — é a única função que escreve produto vindo de fora.

**Importante**: o Hub não tem subtitulo/descricao/imagens/caracteristicas nem avaliação — produtos criados via sync chegam com esses campos vazios/com fallback (`subtitulo = nome`, resto `""`/`[]`). Completar isso é trabalho manual depois no ecomzero, não é bug do sync. Endpoint só cria/atualiza — nunca desativa um produto que existe no ecomzero mas saiu da seleção do Hub (evita apagar/desativar sem querer os produtos seedados manualmente, que não têm origem no Hub).

## Cálculo de frete (Melhor Envio)

`POST /api/shipping/quote` (`src/app/api/shipping/quote/route.ts`) recebe `{ variantId, cep }`, valida com `src/lib/validation/shipping.ts` (CEP normalizado pra 8 dígitos, com ou sem hífen; `variantId` é uuid), chama `shippingService.calculateShipping()` e devolve `{ options: { transportadora, servico, preco, prazoDias }[] }`.

UI: `src/components/ShippingCalculator.tsx` (Client Component) — campo de CEP + botão "Calcular", dentro de `ProductPurchase.tsx` (página de produto). `key={selectedVariant.id}` no componente reseta o estado (CEP digitado, resultado) quando o usuário troca de variante, em vez de um `useEffect` ouvindo a mudança (mesmo padrão do resto do arquivo — ver `nextjs-gotchas.md` #3).

- Sem controle de estoque nem peso/dimensão real cadastrados: `ProductVariant` tem defaults de pacote pequeno genérico (`pesoKg 0.3`, `alturaCm 4`, `larguraCm 16`, `comprimentoCm 11`) — editável por produto depois, mas por ora todo cálculo usa isso.
- CEP de origem é fixo, vem de `config.melhorEnvio.cepOrigem` (env var, não hardcoded — é de onde o vendedor despacha).
- `config.melhorEnvio.{token,baseUrl,cepOrigem,clientId,clientSecret}` são opcionais no Zod (mesmo padrão do `storefrontSyncApiKey`/`blobReadWriteToken`). `baseUrl` tem default pro sandbox (`https://sandbox.melhorenvio.com.br`).
- **Sandbox vs produção (autenticação):** `config.isMelhorEnvioProducao` = `baseUrl` não contém "sandbox". Em **sandbox/dev**, o `shippingService` usa o `MELHOR_ENVIO_TOKEN` fixo da env var. Em **produção**, o token vem do banco via `melhorEnvioAuthService.getValidAccessToken()`, que renova sozinho com 24h de folga usando o `refresh_token` + `client_id`/`client_secret` (`grant_type=refresh_token` em `${baseUrl}/oauth/token`). A credencial vive no singleton `MelhorEnvioCredential` (id fixo `"singleton"`), populada uma vez por `scripts/save-melhor-envio-token.ts` após a troca do authorization_code. **Nunca guardar access_token de produção em env var** — muda a cada refresh.
- Os dois route handlers de frete (`/api/shipping/quote` e `/api/cart/shipping-quote`) fazem o pré-check com `config.isMelhorEnvioConfigurado` (produção exige CEP+client_id+client_secret; sandbox exige CEP+token) → 503 se faltar algo, sem tocar o service.
- `shippingService.ts` nunca deixa vazar erro cru do Melhor Envio: qualquer falha de rede/timeout/API fora do ar vira `ShippingServiceError` com status `502`; variante inexistente ou CEP não atendido (resposta sem nenhuma opção válida) vira `422`.
- **Cache (10 min) e rate limit (20 req/min por IP, janela fixa) são em Postgres** (`ShippingQuoteCache`/`ShippingRateLimit` no `schema.prisma`, funções `getCachedShippingQuote`/`setCachedShippingQuote`/`isShippingRateLimited` em `shippingService.ts`) — não em memória, porque a rota roda em funções serverless sem estado compartilhado entre instâncias/cold starts. Nenhuma limpeza automática de linhas expiradas ainda (nem do cache nem do rate limit) — se a tabela crescer muito, considerar um cron/job de limpeza; não é bloqueante pro volume atual.
