import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "owner" | "staff";
      twoFactorEnabled: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "owner" | "staff";
    twoFactorEnabled?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionIssuedAt?: number;
    role?: "owner" | "staff";
    twoFactorEnabled?: boolean;
  }
}
