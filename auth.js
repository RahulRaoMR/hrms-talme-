import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        role: {}
      },
      async authorize(credentials) {
        await ensureSeedData();

        const email = credentials.email?.trim();
        const password = credentials.password?.trim();

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user || !user.active) return null;

        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    }
  },
  secret: process.env.AUTH_SECRET || "talme-dev-secret"
});
