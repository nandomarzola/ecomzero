import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  AccountServiceError,
  deleteAddress,
  updateAddress,
} from "@/lib/services/accountService";
import {
  addressIdSchema,
  updateAddressSchema,
} from "@/lib/validation/account";

type RouteContext = { params: Promise<{ id: string }> };

function handleAddressError(error: unknown) {
  if (
    error instanceof AccountServiceError &&
    error.code === "ADDRESS_NOT_FOUND"
  ) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(
    { error: "Erro inesperado ao alterar endereço" },
    { status: 500 },
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const params = await context.params;
  const parsedId = addressIdSchema.safeParse(params.id);
  const body = await request.json().catch(() => null);
  const parsedBody = updateAddressSchema.safeParse(body);
  if (!parsedId.success || !parsedBody.success) {
    return NextResponse.json(
      {
        error: "Payload inválido",
        issues: [
          ...(!parsedId.success ? parsedId.error.issues : []),
          ...(!parsedBody.success ? parsedBody.error.issues : []),
        ],
      },
      { status: 400 },
    );
  }

  try {
    const address = await updateAddress(
      session.user.id,
      parsedId.data,
      parsedBody.data,
    );
    return NextResponse.json(address);
  } catch (error) {
    return handleAddressError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const params = await context.params;
  const parsedId = addressIdSchema.safeParse(params.id);
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Endereço inválido", issues: parsedId.error.issues },
      { status: 400 },
    );
  }

  try {
    await deleteAddress(session.user.id, parsedId.data);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleAddressError(error);
  }
}
