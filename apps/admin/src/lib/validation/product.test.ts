import assert from "node:assert/strict";
import test from "node:test";
import { productInputSchema } from "./product";

function productInput(skus: string[]) {
  return {
    nome: "Produto de teste",
    tipo: "variacoes",
    categoryId: "5b2f0fc6-b3ef-4ae8-9db0-90c7ece98947",
    subtitulo: "Subtítulo",
    descricao: "Descrição",
    ativo: true,
    isNovidade: false,
    isPromocao: false,
    imagem: "https://example.com/capa.jpg",
    imagens: [],
    linkShopee: "",
    linkMercadoLivre: "",
    linkTiktokShop: "",
    linkShein: "",
    variantes: skus.map((skuInterno, index) => ({
      label: `Variação ${index + 1}`,
      precoDe: "10,00",
      precoPor: "9,00",
      skuInterno,
      pesoKg: "0,3",
      comprimentoCm: "11",
      larguraCm: "16",
      alturaCm: "4",
    })),
  };
}

test("normaliza o SKU interno antes de salvar", () => {
  const parsed = productInputSchema.parse(productInput(["  ez-0012  ", "ez-0013"]));
  assert.equal(parsed.variantes[0]?.skuInterno, "EZ-0012");
  assert.equal(parsed.variantes[1]?.skuInterno, "EZ-0013");
});

test("rejeita SKU interno repetido no mesmo produto sem diferenciar maiúsculas", () => {
  const parsed = productInputSchema.safeParse(productInput(["EZ-0012", "ez-0012"]));
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.match(parsed.error.issues[0]?.message ?? "", /SKU interno.*repetido/);
});
