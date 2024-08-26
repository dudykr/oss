import { db } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Passkey from "next-auth/providers/passkey";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [Google, Passkey],

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
  },

  experimental: { enableWebAuthn: true },
});
