# Infra e deploy — EcomZero

## Banco local de dev

Não existe Postgres local nativo neste ambiente — sobe via Docker:

```bash
docker run -d --name ecomzero-pg-dev \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ecomzero \
  -p 5433:5432 postgres:16-alpine
```

`.env` (raiz do projeto, nunca commitado) aponta pra ele:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ecomzero?schema=public"
```

Se o container não existir mais (`docker ps` não mostra `ecomzero-pg-dev`), recrie com o comando acima e rode `npx prisma migrate deploy` + `npx prisma db seed` pra popular.

## ⚠️ Histórico de migração não é replayável do zero — `prisma migrate dev` QUEBRA

As duas primeiras migrações estão fora de ordem: `20260713155435_cart` (timestamp 155435) vem **antes** de `20260713164731_init` (164731) na ordem lexicográfica, mas `cart` referencia a tabela `Order` que só é criada em `init`. O banco de dev/prod atual está OK (as migrações foram gravadas como aplicadas na ordem de criação real), mas **qualquer replay do zero falha** — inclusive o shadow database que o `prisma migrate dev` usa pra validar:

```
Error: P3006 ... Migration `20260713155435_cart` failed ... relation "Order" does not exist
```

Consequência prática: **não use `prisma migrate dev` pra criar migração nova** enquanto o histórico não for consertado. Fluxo que funciona pra adicionar uma migração (usado na `melhor_envio_credential`):

```bash
# 1. Edita o schema.prisma
# 2. Gera o SQL diffando o BANCO VIVO (via datasource do prisma.config.ts) contra o schema — NÃO usa shadow DB:
TS=$(date +%Y%m%d%H%M%S)_nome_da_migracao
mkdir -p "prisma/migrations/$TS"
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > "prisma/migrations/$TS/migration.sql"
# 3. Aplica só a pendente (migrate deploy NÃO usa shadow DB, não replaya as antigas):
npx prisma migrate deploy
npx prisma generate
```

(Prisma 7 renomeou as flags do `migrate diff`: é `--from-config-datasource` / `--to-schema`, não mais `--from-schema-datasource`/`--from-schema-datamodel`.) Consertar de vez o histórico (renomear as duas pastas pra ordem certa) fica pra quando alguém puder recriar o banco de prod do zero — não é bloqueante hoje porque prod só roda `migrate deploy` de migrações já ordenadas na prática.

## Produção — Vercel "Prisma Postgres"

Projeto: `nandomarzolas-projects/ecomzero`. O banco de produção é a integração **Prisma Postgres** da Vercel (não é a "Vercel Postgres" nativa antiga, nem Neon/Supabase direto — é o storage próprio da Prisma, backend real em `db.prisma.io:5432`).

### Env vars que a integração cria automaticamente

| Var | O que é | Usamos? |
|---|---|---|
| `PRISMA_DATABASE_URL` | Proxy do **Prisma Accelerate** (`prisma+postgres://...`) | **Não** — incompatível com `@prisma/adapter-pg`/`pg` |
| `POSTGRES_URL` | Conexão direta `postgresql://...` | Equivalente à que usamos |
| `DATABASE_URL` | Alias direto, criado automaticamente pela integração pra compatibilidade com projetos Prisma que esperam esse nome | **Esta é a que o código usa** — `prisma.config.ts` e `src/lib/config.ts` já esperam `DATABASE_URL`, zero código extra precisou ser escrito |

Confirmado nos logs reais de build: `Datasource "db": PostgreSQL database "postgres", schema "public" at "db.prisma.io:5432"` — é conexão direta de verdade, não Accelerate.

### As vars de banco são "sensíveis" — não dá pra ler o valor de fora

`vercel env pull` baixa `DATABASE_URL`/`POSTGRES_URL`/`PRISMA_DATABASE_URL` como **string vazia** — por design, a Vercel bloqueia leitura de env vars sensíveis via CLI/dashboard depois de criadas. Elas só ficam disponíveis de verdade **dentro do processo de build/runtime da própria Vercel**.

Isso significa: pra rodar migração/seed contra produção, não dá pra puxar a connection string pra rodar localmente. O jeito que funcionou:

1. **Migração roda sozinha em todo deploy** — `package.json`:
   ```json
   "build": "prisma migrate deploy && next build"
   ```
   Isso é seguro porque `migrate deploy` só aplica migrações pendentes (idempotente, nunca dá erro se não houver nada novo).

2. **Seed** não é parte do build normal (rodaria em todo deploy, o que não faz sentido pra dado de catálogo). Da primeira vez, foi colado temporariamente no `build` (`prisma migrate deploy && prisma db seed && next build`), rodado um `vercel deploy --prod` (que builda **remotamente** na infra da Vercel, onde a env var sensível existe de verdade), e revertido depois. Se precisar semear de novo: repita esse padrão (editar, deployar, reverter) — não existe outro jeito sem expor a credencial.

## Deploy

CLI da Vercel não vem instalada — `npx vercel <comando>` instala na hora.

```bash
npx vercel login          # device-flow — usuário aprova no navegador dele
npx vercel link           # vincula a pasta ao projeto (cria .vercel/, gitignored)
npx vercel env ls         # lista NOMES das env vars (nunca os valores)
npx vercel deploy --prod  # builda remotamente na Vercel e promove pra produção — nunca use sem o usuário pedir explicitamente nesta conversa
```

`vercel deploy --prod` builda o código do **diretório local atual** (não precisa de `git push`) direto na infra da Vercel — é assim que a migração/build roda com a env var sensível de verdade, sem nunca tocar o valor localmente.

**Nunca rode deploy sem pedido explícito do usuário na mensagem atual** — mesmo que já tenha feito deploy antes na mesma conversa, cada deploy novo precisa de autorização nova.

## Verificação sem navegador

Este ambiente não tem ferramenta de automação de browser. Para validar de verdade (não só tsc/eslint/build):

1. **Lógica de negócio pura**: script descartável importando o service direto, ex.:
   ```bash
   cat > scratch-test.ts << 'EOF'
   import { prisma } from "@/lib/db";
   import * as cartService from "@/lib/services/cartService";
   // ... exercita as funções, valida com throw se algo não bater
   EOF
   npx tsx --env-file=.env scratch-test.ts
   rm scratch-test.ts   # sempre apague depois
   ```
2. **Conteúdo renderizado**: `next build && next start`, depois `curl` + `grep`/`python3` no HTML pra confirmar que o dado certo apareceu (nome de produto, preço formatado, classe CSS aplicada, etc.) — não confie em `grep -c` sem `-o` (conta linhas, não ocorrências, e o HTML de produção geralmente é uma linha só).
3. **Sempre mate o processo do `next start` depois** (`fuser -k 3000/tcp`) — já rolou de um servidor antigo ficar preso na porta e o teste seguinte validar o build errado sem perceber.

Seja transparente no relatório final sobre o que foi testado assim vs. o que exigiria clique real no navegador (touch, drag, etc.) e não foi possível testar.
