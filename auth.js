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
        const email = credentials.email?.trim();
        const password = credentials.password?.trim();

        if (!email || !password) return null;

        const demoUsers = {
          "director@talme.ai": {
            password: "talme123",
            user: {
              id: "demo-admin",
              name: "Talme Director",
              email: "director@talme.ai",
              role: "Enterprise Admin",
              employeeId: null
            }
          },
          "hr@talme.ai": {
            password: "hr123",
            user: {
              id: "demo-hr",
              name: "Talme HR",
              email: "hr@talme.ai",
              role: "HR",
              employeeId: null
            }
          },
          "TLM-2048": {
            password: "employee123",
            user: {
              id: "demo-employee",
              name: "Manish Gupta",
              email: "manish.gupta@talme.ai",
              role: "Employee",
              employeeId: "TLM-2048"
            }
          }
        };

        const demoUser = demoUsers[email];
        if (demoUser && password === demoUser.password) {
          return demoUser.user;
        }

        await ensureSeedData();

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
