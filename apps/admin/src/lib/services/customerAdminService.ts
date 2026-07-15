import { prisma } from "@/lib/db";

export type CustomerListItem = {
  id: string;
  nome: string | null;
  email: string;
  telefone: string | null;
  aceitaMarketing: boolean;
  createdAt: Date;
};

export async function listCustomers(search?: string): Promise<CustomerListItem[]> {
  const query = search?.trim();
  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { telefone: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      telefone: true,
      aceitaMarketing: true,
      createdAt: true,
    },
  });
  return users.map(({ name, ...user }) => ({ ...user, nome: name }));
}
