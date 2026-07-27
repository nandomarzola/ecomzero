import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeFooterBenefits,
  normalizeFooterColumns,
  normalizeFooterSecurityItems,
} from "./settingsConfigDomain";

test("entrega a estrutura completa do novo rodapé quando ainda não há configuração", () => {
  assert.equal(normalizeFooterBenefits(null).length, 4);
  assert.equal(normalizeFooterSecurityItems(null).length, 5);
});

test("preserva toggles e conteúdo editados no admin", () => {
  const [benefit] = normalizeFooterBenefits([
    {
      id: "envio",
      titulo: "Envio no mesmo dia",
      descricao: "Para pedidos aprovados até 12h",
      icone: "truck",
      ativo: false,
    },
  ]);

  assert.equal(benefit?.titulo, "Envio no mesmo dia");
  assert.equal(benefit?.ativo, false);
});

test("converte o título legado Ajuda para Atendimento", () => {
  const [column] = normalizeFooterColumns([
    {
      id: "ajuda",
      titulo: "Ajuda",
      tipo: "links",
      ativo: true,
      links: [],
    },
  ]);

  assert.equal(column?.titulo, "Atendimento");
});

test("converte links institucionais legados nas páginas dedicadas", () => {
  const [column] = normalizeFooterColumns([
    {
      id: "institucional",
      titulo: "Institucional",
      tipo: "links",
      ativo: true,
      links: [
        { id: "sobre", label: "Sobre", href: "/#sobre", ativo: true },
        { id: "entrega", label: "Entrega", href: "/#sobre", ativo: true },
      ],
    },
  ]);

  assert.equal(column?.links[0]?.href, "/sobre");
  assert.equal(column?.links[1]?.href, "/entrega-segura");
});
