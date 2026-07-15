import { z } from "zod";

const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().min(0, "O valor não pode ser negativo").optional(),
);
const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().positive("Informe um limite maior que zero").optional(),
);
const optionalDate = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.date().optional(),
);

export const couponInputSchema = z
  .object({
    codigo: z.string().trim().min(3, "O código precisa ter ao menos 3 caracteres").max(40).transform((value) => value.toUpperCase().replace(/\s+/g, "")),
    descricao: z.string().trim().max(300).optional(),
    tipo: z.enum(["percentual", "valor_fixo"]),
    valor: z.coerce.number().positive("Informe um desconto maior que zero"),
    valorMinimoPedido: optionalMoney,
    descontoMaximo: optionalMoney,
    limiteUsoTotal: optionalPositiveInteger,
    limiteUsoPorCliente: z.coerce.number().int().positive("O limite por cliente deve ser maior que zero"),
    inicioEm: optionalDate,
    expiraEm: optionalDate,
    ativo: z.boolean(),
  })
  .superRefine((input, context) => {
    if (input.tipo === "percentual" && input.valor > 100) context.addIssue({ code: "custom", path: ["valor"], message: "O percentual não pode passar de 100%" });
    if (input.inicioEm && input.expiraEm && input.expiraEm <= input.inicioEm) context.addIssue({ code: "custom", path: ["expiraEm"], message: "A expiração precisa ser posterior ao início" });
  });

export type CouponInput = z.infer<typeof couponInputSchema>;
