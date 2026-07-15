import { NextResponse } from "next/server";
import {
  AddressLookupServiceError,
  lookupAddressByCep,
} from "@/lib/services/addressLookupService";
import { cepSchema } from "@/lib/validation/shipping";

type AddressLookupRouteProps = {
  params: Promise<{ cep: string }>;
};

export async function GET(
  _request: Request,
  { params }: AddressLookupRouteProps,
) {
  const parsed = cepSchema.safeParse((await params).cep);
  if (!parsed.success) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
  }

  try {
    return NextResponse.json(await lookupAddressByCep(parsed.data));
  } catch (error) {
    if (error instanceof AddressLookupServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Erro inesperado ao consultar CEP" },
      { status: 502 },
    );
  }
}
