import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed-db";

const credentialRoles = {
  admin: "Enterprise Admin",
  hr: "HR",
  employee: "Employee"
};

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
        const identifier = credentials.email?.trim();
        const password = credentials.password?.trim();
        const expectedRole = credentialRoles[credentials.role] || credentials.role;

        if (!identifier || !password) return null;

        await ensureSeedData();

        const employee =
          expectedRole === "Employee" || !identifier.includes("@")
            ? await prisma.employee.findUnique({
                where: { employeeId: identifier },
                select: { id: true, employeeId: true, email: true, name: true }
              })
            : null;
        const loginEmail = employee?.email || identifier.toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email: loginEmail }
        });

        if (!user || !user.active) return null;
        if (expectedRole && user.role !== expectedRole) return null;

        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) return null;

        return {
          id: user.id,
          name: employee?.name || user.name,
          email: user.email,
          role: user.role,
          employeeId: employee?.employeeId || null
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
