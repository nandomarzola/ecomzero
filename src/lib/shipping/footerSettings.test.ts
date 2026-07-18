import assert from "node:assert/strict";
import test from "node:test";
import {
  storeFooterBenefits,
  storeFooterColumns,
  storeFooterSecurityItems,
} from "@/lib/storeSettingsDomain";

test("usa os quatro benefícios e cinco argumentos de segurança padrão", () => {
  const benefits = storeFooterBenefits(null);
  const securityItems = storeFooterSecurityItems(undefined);

  assert.equal(benefits.length, 4);
  assert.deepEqual(benefits.map((item) => item.id), ["envio", "compra-segura", "nota-fiscal", "originais"]);
  assert.equal(securityItems.length, 5);
  assert.equal(securityItems.every((item) => item.ativo), true);
});

test("mantém ids fixos e aplica conteúdo configurado no admin", () => {
  const benefits = storeFooterBenefits([
    {
      id: "envio",
      titulo: "Entrega expressa",
      descricao: "Postagem rápida para todo o país",
      icone: "truck",
      ativo: false,
    },
    {
      id: "desconhecido",
      titulo: "Não deve aparecer",
      descricao: "Item fora do layout",
      icone: "shield",
      ativo: true,
    },
  ]);

  assert.equal(benefits.length, 4);
  assert.deepEqual(benefits[0], {
    id: "envio",
    titulo: "Entrega expressa",
    descricao: "Postagem rápida para todo o país",
    icone: "truck",
    ativo: false,
  });
  assert.equal(benefits.some((item) => item.id === "desconhecido"), false);
});

test("normaliza a coluna antiga Ajuda para Atendimento", () => {
  const columns = storeFooterColumns([
    {
      id: "ajuda",
      titulo: "Ajuda",
      tipo: "links",
      ativo: true,
      links: [],
    },
  ]);

  assert.equal(columns[0]?.titulo, "Atendimento");
});
