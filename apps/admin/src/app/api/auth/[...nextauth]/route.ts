import { handlers } from "@/auth";

// Route handler do NextAuth (Node runtime — usa Prisma/bcrypt no authorize).
export const { GET, POST } = handlers;
