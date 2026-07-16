# Roadmap e decisões de produto — EcomZero

Fonte de verdade de "o que já foi decidido" — antes de propor uma mudança de escopo, confira aqui se já não foi discutido e decidido com o dono do produto.

## Fase 1 — Fundação de dados (concluída)

Saiu de vitrine 100% estática (JSON em `src/data/produtos.json`) pra Prisma + Postgres, seguindo arquitetura limpa desde o início (services, validação, tipos de domínio separados do Prisma). Sem pagamento/frete/fiscal — só a fundação, de propósito.

- Schema: `Product`, `ProductVariant` (sem estoque, de propósito), `Order`/`OrderItem` (só a tabela, sem lógica ainda).
- `home.json` deletado; slides do hero migraram pra `src/data/hero-slides.json` (conteúdo de marketing curado, não é dado de produto — nunca duplicar fonte de produto ali).
- Badge/estrelas de avaliação/filtro `?f=` **removidos de propósito** — eram dados fake hardcoded (5 estrelas fixas, 128 reviews fixos pra todo produto) sem base real. Se pedirem pra trazer de volta, é feature nova (precisa de sistema de avaliação real), não um revert.
- Bug corrigido: link da Shopee no botão de compra era fixo por produto, ignorando a variante selecionada. Hoje usa `ProductVariant.linkShopee` com fallback pro link do produto pai (`// TODO: confirmar link Shopee por variante` — a maioria das variantes ainda não tem link próprio cadastrado).
- SEO: página de produto virou SSR (era SSG com `generateStaticParams`) pra permitir produto novo sem rebuild.

## Fix de SEO — grade de produtos sumindo do HTML estático

Achado depois da Fase 1: `Showcase`/`CategoryStrip` usavam `useSearchParams()` direto, e a home inteira ficava sem a grade de produtos pra qualquer crawler que não executa JS. Corrigido isolando a leitura em `ProductFiltersProvider` (ver `nextjs-gotchas.md` #1). **Esse padrão é obrigatório pra qualquer novo filtro/estado que dependa de query string.**

## Fase 2 — Carrinho (concluída)

**Decisão de produto explícita**: os dois canais de compra coexistem — "Adicionar ao carrinho" (site) e "Comprar na Shopee" (redirect) aparecem juntos na página de produto, com o texto "Escolha onde comprar — preço e frete podem variar entre nosso site e a Shopee". Motivo dado pelo dono: o preço no site pode ser mais barato, mas o frete pode tornar a compra mais cara que na Shopee — o cliente precisa ter esse poder de escolha. **Não remover nenhum dos dois canais sem confirmar de novo.**

**Escopo deliberadamente parado em "só o carrinho"**: adicionar/remover/atualizar quantidade/ver itens. Sem endereço, sem frete, sem pagamento, sem "finalizar compra" de verdade — isso é Fase 3+.

- Carrinho = `Order` com `status: "draft"`, sessão anônima via cookie httpOnly (`ecomzero_cart_session`, 90 dias) — ainda sem sistema de login.
- Server Actions (não API routes) pra mutação — decisão de arquitetura: é o padrão nativo do Next 16 + React 19 pra mutação vinda de client, evita boilerplate de fetch+JSON mantendo a mesma regra (valida → chama service → responde).

### Redesign visual do carrinho (mockup fornecido pelo usuário)

Réplica visual de uma referência, com nossa paleta de cores. Elementos da referência que dependem de frete/pagamento (ainda não existem): **mostrados mas desabilitados**, com indicação clara "Em breve" — decisão explícita do usuário (não omitir, não fingir que funciona). Ícones de bandeira de cartão são texto estilizado, não logo oficial (evita usar marca registrada sem asset licenciado).

## Fase 2.1 — Redesign mobile (concluída)

Mockup fornecido pelo usuário pro layout mobile da home. Três coisas viraram funcionalidade nova (não só visual), com decisão explícita:

- **Busca**: funcional agora — filtro client-side por nome (normalizado, sem acento/case), não precisou de infra nova.
- **Botão de adicionar direto na listagem de produtos** (ícone de carrinho no lugar de "VER PRODUTO", só no mobile): adiciona a variante padrão (`variantes[0]`) direto ao carrinho sem sair da listagem. `ProductCard` ganhou prop `layout?: "auto" | "grid"` — `"grid"` força o cartão vertical de sempre (usado no carrossel de relacionados do carrinho, que precisa de largura fixa); `"auto"` (padrão) é responsivo: lista horizontal com quick-add no mobile, cartão vertical com "VER PRODUTO" a partir de `sm:`.
- **Barra de navegação fixa embaixo (mobile)**: Início / Categorias / Carrinho / Sobre. A aba "Ofertas" da referência virou "Carrinho" — decisão do usuário, porque não existe sistema de ofertas real e carrinho de verdade já existe.

## Pendente — Fase 3+ (não iniciado, não assumir escopo sem pedido explícito)

- Endereço de entrega / resumo de pedido antes do pagamento
- Cálculo de frete real (hoje é texto estático "A calcular")
- Pagamento (hoje é botão desabilitado "Em breve")
- Fiscal (nota fiscal, etc.) — nem mencionado ainda além do pedido original de "não implementar ainda"
- `cpf_high`/controle de limite de pedidos — não é deste projeto, é do ProfitTrack (`projeto-ecomzero-hub`), não confundir os dois repositórios
- Detecção automática de estoque: **não vai existir** — decisão de produto permanente, não é "ainda não implementado"

## Fase 2.2 — Redesign página de produto + header (concluída)

Mockups fornecidos pelo usuário (header estilo Casas Bahia; produto com box "Compre na EcomZero" + cards de marketplace). Decisões tomadas sem perguntar (padrão já estabelecido de não inventar dado fake):

- **Estrelas/nº de avaliações/vendas — REVERTIDO**: eu tinha omitido por ser o mesmo dado fake removido na Fase 1. O usuário confirmou explicitamente (perguntei antes de mudar) que quer sim, "4,9 (128 avaliações) | Mais de 1.000 vendas" hardcoded igual em todo produto, puramente visual até existir sistema de avaliação real. Mesma coisa pra frase "Mais barato e com frete calculado na hora!" (estava amenizada, voltou ao texto literal do mockup) e o campo de CEP/botão Calcular (estava estilizado como desabilitado/acinzentado, agora tem visual normal/ativo — só não tem função real ainda). **Não é mais um "não fazer" — é dado estático aprovado deliberadamente, diferente do badge/filtro que foi removido de vez na Fase 1.** Se questionar de novo se deve fabricar número, a resposta agora é: sim, pra esses três elementos específicos da página de produto, com aprovação já dada.
- **Sem badges de imagem tipo "Edição Limitada"/"Colecionável"** — não existe campo de tag no schema; não fabricado.
- **"Ou compre nos marketplaces" só mostra Shopee hoje** — é o único canal com link real (`Product.linkShopee`/`ProductVariant.linkShopee`). Mercado Livre e TikTok Shop do mockup **não têm campo no schema nem link real** — não foram adicionados com preço/botão fake. Se pedirem ML/TikTok de verdade: precisa criar `linkMercadoLivre`/`linkTiktok` no `ProductVariant` primeiro.
- Card da Shopee usa a cor de marca deles (`#EE4D2D`) só nesse elemento — única exceção deliberada à paleta verde/preto, pra diferenciar canal externo.
- `ProductPurchase.tsx` ganhou seletor de quantidade (novo) e usa a quantidade real no `addToCartAction`. Frete/CEP: inerte, mesmo padrão "em breve" do carrinho.
- Trust badges do rodapé da página de produto trocaram de "Shopee-específico" (fazia sentido só quando só existia Shopee) pra genérico — reaproveita `TrustBadges.tsx` (novo componente compartilhável, usado só na página de produto por enquanto; `/carrinho` mantém sua versão inline própria, não foi tocada).
- Header: busca (`SearchBar`) migrou pra dentro do `Header` (barra estilo Casas Bahia, só desktop) — `ProductFiltersProvider` subiu de `page.tsx` pra `layout.tsx` (global) por causa disso. CEP/Conta/Favoritos no header são inertes ("em breve"), mesmo padrão de honestidade.

## Fase 3 — Cupons end-to-end (concluída — 2026-07-16)

Cupom criado no admin agora funciona de verdade no carrinho/checkout da loja. Antes existiam os models `Coupon`/`CouponRedemption` mas NADA no carrinho consumia — era só CRUD.

- **Schema (migration `coupon_rules_extension`):** enum `CouponDiscountType` ganhou `frete_gratis`; novo enum `CouponAppliesTo` (`toda_loja`|`categoria`|`produto`); `Coupon.valor` virou nullable (null p/ frete grátis); novos campos `aplicaEm`/`categoriaId`/`produtoId`/`combinavel`/`exibirNoSite`/`primeiraCompra`; `Order` ganhou `couponId` (FK) + `descontoCupom`. Migration nasceu no schema RAIZ (dono) via `migrate diff --from-config-datasource --to-schema` + `migrate deploy`; o mirror `apps/admin/prisma/schema.prisma` foi atualizado à mão (só os campos que o admin lê) + `prisma generate`. Names em PT, seguindo o padrão do resto.
- **Decisão de escopo (dono):** só `aplicaEm = toda_loja` nesta fase — Categoria/Produto ficam no schema mas escondidos na UI (fase 2). `combinavel` é gravado mas NÃO enforced: o carrinho suporta um único cupom (`Order.couponId`), então não há stacking pra validar ainda. Página pública de cupons (`exibirNoSite`) NÃO foi criada — só o campo é persistido.
- **Validação em 2 camadas** (`src/lib/services/couponService.ts`): `validateForCart` (preview no carrinho, sem identidade) e `validateForCheckout` (AUTORITATIVA, roda DENTRO da transação de `createOrderFromCart`, com limite por cliente via `CouponRedemption` e primeira-compra via pedidos pagos anteriores). Mensagens de erro específicas (`CouponError` com `code`).
- **Dinheiro:** desconto aplicado ao `Order.total` em `createOrderFromCart` ANTES da preferência Mercado Pago → cliente paga o valor certo e a reconciliação (`order.total` vs `transactionAmount`) bate. Frete grátis mantém `valorFrete` real (custo da etiqueta) e joga o valor em `descontoCupom`; total = subtotal.
- **Uso:** `recordCouponUsage` grava `CouponRedemption` + incrementa `usos` na MESMA transação que marca o pedido como `pago` (em `orderPaymentService.reconcilePayment`). Idempotente via `CouponRedemption.orderId` unique — webhook reentrante não conta 2x.
- **Admin:** tela "Novo cupom" refeita em rota própria (`/cupons/novo` + `/cupons/[id]/editar`, `CouponForm.tsx`) — 2 colunas com resumo live, botões Salvar rascunho (salva inativo, validação leniente) vs Salvar cupom (validação completa). Lista (`CouponManager`) virou só listagem + navegação.
