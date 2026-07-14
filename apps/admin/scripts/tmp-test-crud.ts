// Descartável — testa o fluxo real do service (create/update/get) contra o
// banco local + upload real no Blob. Cria produto de teste com 2 variantes.
import { put } from "@vercel/blob";
import { createProduct, updateProduct, getProductById } from "../src/lib/services/productAdminService";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function main() {
  const blob = await put(`produtos/teste-${crypto.randomUUID()}.png`, PNG_1X1, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: "image/png",
    addRandomSuffix: false,
  });
  console.log("Blob URL:", blob.url);

  const created = await createProduct({
    nome: "PRODUTO TESTE CRUD ADMIN",
    categoria: "Testes",
    subtitulo: "Produto de teste automatizado",
    descricao: "Criado pelo script de validação do admin. Remover depois.",
    ativo: true,
    imagem: blob.url,
    imagens: [blob.url],
    linkMercadoLivre: undefined,
    linkTiktokShop: undefined,
    linkShein: undefined,
    variantes: [
      {
        label: "1 unidade",
        precoDe: 99.9,
        precoPor: 79.9,
        skuInterno: "TESTE-1UN",
        linkShopee: undefined,
        pesoKg: 0.2,
        comprimentoCm: 20,
        larguraCm: 15,
        alturaCm: 5,
      },
      {
        label: "2 unidades",
        precoDe: 189.9,
        precoPor: 149.9,
        skuInterno: "TESTE-2UN",
        linkShopee: undefined,
        pesoKg: 0.4,
        comprimentoCm: 20,
        larguraCm: 15,
        alturaCm: 8,
      },
    ],
  });
  console.log("createProduct → id:", created.id);

  const full = await getProductById(created.id);
  console.log("slug:", full?.slug, "| variantes:", full?.variantes.length, "| imagem:", full?.imagem);

  console.log("BLOB_URL_MARKER=" + blob.url);
  console.log("PRODUCT_ID_MARKER=" + created.id);
  console.log("SLUG_MARKER=" + full?.slug);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
