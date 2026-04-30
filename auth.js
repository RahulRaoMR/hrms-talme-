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

        const employee = await prisma.employee.findUnique({
          where: { employeeId: email }
        });

        if (employee && password === "employee123") {
          return {
            id: employee.id,
            name: employee.name,
            email: employee.email || `${employee.employeeId.toLowerCase()}@talme.local`,
            role: "Employee",
            employeeId: employee.employeeId
          };
        }

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
          role: user.role,
          employeeId: null
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.employeeId = user.employeeId;
      } else if (!token.role && token.email) {
        const currentUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { role: true }
        });
        token.role = currentUser?.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.employeeId = token.employeeId;
      }
      return session;
    }
  },
  secret: process.env.AUTH_SECRET || "talme-dev-secret"
});
