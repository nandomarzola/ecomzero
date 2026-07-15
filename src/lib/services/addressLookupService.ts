export type AddressLookupResult = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export class AddressLookupServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 502,
  ) {
    super(message);
    this.name = "AddressLookupServiceError";
  }
}

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | "true";
};

export async function lookupAddressByCep(
  cep: string,
): Promise<AddressLookupResult> {
  let response: Response;
  try {
    response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new AddressLookupServiceError(
      "Consulta de CEP indisponível no momento",
      502,
    );
  }

  if (!response.ok) {
    throw new AddressLookupServiceError(
      "Consulta de CEP indisponível no momento",
      502,
    );
  }

  const data = (await response.json().catch(() => null)) as ViaCepResponse | null;
  if (!data || data.erro === true || data.erro === "true") {
    throw new AddressLookupServiceError("CEP não encontrado", 404);
  }

  if (!data.localidade || !data.uf) {
    throw new AddressLookupServiceError(
      "Consulta de CEP retornou dados incompletos",
      502,
    );
  }

  return {
    cep: data.cep?.replace(/\D/g, "") || cep,
    logradouro: data.logradouro?.trim() ?? "",
    bairro: data.bairro?.trim() ?? "",
    cidade: data.localidade.trim(),
    uf: data.uf.trim().toUpperCase(),
  };
}
