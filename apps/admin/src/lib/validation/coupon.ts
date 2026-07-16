import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalMoney = z.preprocess(
  emptyToUndefined,
  z.coerce.number().min(0, "O valor não pode ser negativo").optional(),
);
const optionalPositiveInteger = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive("Informe um limite maior que zero").optional(),
);
const optionalDate = z.preprocess(
  emptyToUndefined,
  z.coerce.date().optional(),
);
const optionalDiscountValue = z.preprocess(
  emptyToUndefined,
  z.coerce.number().positive("Informe um desconto maior que zero").optional(),
);
const optionalTrimmedString = z.preprocess(
  emptyToUndefined,
  z.string().trim().optional(),
);

// Shape base compartilhado entre rascunho e publicação — mantém `CouponInput`
// com um único tipo inferido (a diferença é só o rigor da validação).
const couponShape = {
  codigo: z
    .string()
    .trim()
    .min(3, "O código precisa ter ao menos 3 caracteres")
    .max(40)
    .transform((value) => value.toUpperCase().replace(/\s+/g, "")),
  descricao: z.string().trim().max(300).optional(),
  tipo: z.enum(["percentual", "valor_fixo", "frete_gratis"]),
  valor: optionalDiscountValue,
  valorMinimoPedido: optionalMoney,
  descontoMaximo: optionalMoney,
  limiteUsoTotal: optionalPositiveInteger,
  limiteUsoPorCliente: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 1 : value),
    z.coerce.number().int().positive("O limite por cliente deve ser maior que zero"),
  ),
  aplicaEm: z.enum(["toda_loja", "categoria", "produto"]).default("toda_loja"),
  categoriaId: optionalTrimmedString,
  produtoId: optionalTrimmedString,
  combinavel: z.boolean(),
  exibirNoSite: z.boolean(),
  primeiraCompra: z.boolean(),
  inicioEm: optionalDate,
  expiraEm: optionalDate,
  ativo: z.boolean(),
};

function assertDiscountAndScope(
  input: { tipo: string; valor?: number; aplicaEm: string; categoriaId?: string; produtoId?: string },
  ctx: z.RefinementCtx,
) {
  if (input.tipo === "percentual" && input.valor !== undefined && input.valor > 100) {
    ctx.addIssue({ code: "custom", path: ["valor"], message: "O percentual não pode passar de 100%" });
  }
  if (input.aplicaEm === "categoria" && !input.categoriaId) {
    ctx.addIssue({ code: "custom", path: ["categoriaId"], message: "Selecione a categoria elegível." });
  }
  if (input.aplicaEm === "produto" && !input.produtoId) {
    ctx.addIssue({ code: "custom", path: ["produtoId"], message: "Selecione o produto elegível." });
  }
}

// Publicação ("Salvar cupom") — validação completa.
export const couponPublishSchema = z.object(couponShape).superRefine((input, ctx) => {
  assertDiscountAndScope(input, ctx);
  if (input.tipo !== "frete_gratis" && input.valor === undefined) {
    ctx.addIssue({ code: "custom", path: ["valor"], message: "Informe o valor do desconto." });
  }
  if (!input.inicioEm) {
    ctx.addIssue({ code: "custom", path: ["inicioEm"], message: "Informe a data de início." });
  }
  if (!input.expiraEm) {
    ctx.addIssue({ code: "custom", path: ["expiraEm"], message: "Informe a data de término." });
  }
  if (input.inicioEm && input.expiraEm && input.expiraEm <= input.inicioEm) {
    ctx.addIssue({ code: "custom", path: ["expiraEm"], message: "A expiração precisa ser posterior ao início." });
  }
});

// Rascunho ("Salvar rascunho") — só o essencial; o cupom é salvo inativo.
export const couponDraftSchema = z.object(couponShape).superRefine((input, ctx) => {
  assertDiscountAndScope(input, ctx);
  if (input.inicioEm && input.expiraEm && input.expiraEm <= input.inicioEm) {
    ctx.addIssue({ code: "custom", path: ["expiraEm"], message: "A expiração precisa ser posterior ao início." });
  }
});

export type CouponInput = z.infer<typeof couponPublishSchema>;
