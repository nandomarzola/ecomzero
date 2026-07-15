import { z } from "zod";

const digits = (value: string) => value.replace(/\D/g, "");
const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

export const shippingSettingsSchema = z
  .object({
    nomeRemetente: z.string().trim().min(2, "Informe o nome do remetente").max(120),
    emailRemetente: z.string().trim().email("E-mail do remetente inválido"),
    telefoneRemetente: z.string().transform(digits).pipe(z.string().min(10, "Telefone inválido").max(11)),
    cpfCnpjRemetente: z.string().transform(digits).refine((value) => value.length === 11 || value.length === 14, "CPF ou CNPJ inválido"),
    inscricaoEstadual: optionalText(30),
    atividadeEconomica: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().transform(digits).pipe(z.string().max(12)).optional(),
    ),
    cepOrigem: z.string().transform(digits).pipe(z.string().length(8, "CEP inválido")),
    logradouroOrigem: z.string().trim().min(2, "Informe o logradouro").max(160),
    numeroOrigem: z.string().trim().min(1, "Informe o número").max(20),
    complementoOrigem: optionalText(80),
    bairroOrigem: z.string().trim().min(2, "Informe o bairro").max(100),
    cidadeOrigem: z.string().trim().min(2, "Informe a cidade").max(100),
    ufOrigem: z.string().trim().toUpperCase().length(2, "UF inválida"),
  })
  .superRefine((input, context) => {
    if (input.cpfCnpjRemetente.length === 14 && !input.inscricaoEstadual) {
      context.addIssue({
        code: "custom",
        path: ["inscricaoEstadual"],
        message: "Informe a inscrição estadual ou ISENTO para o CNPJ",
      });
    }
  });

export const createShipmentSchema = z.discriminatedUnion("tipoDocumentoFiscal", [
  z.object({
    tipoDocumentoFiscal: z.literal("nota_fiscal"),
    chaveNotaFiscal: z.string().transform(digits).pipe(z.string().length(44, "A chave da NF-e deve ter 44 dígitos")),
  }),
  z.object({
    tipoDocumentoFiscal: z.literal("declaracao_conteudo"),
    chaveNotaFiscal: z.string().optional(),
    declaracaoConfirmada: z.literal(true, {
      error: "Confirme que a declaração de conteúdo é permitida para este envio",
    }),
  }),
]);

export type ShippingSettingsInput = z.infer<typeof shippingSettingsSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
