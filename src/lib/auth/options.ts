import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import UserModel from "@/models/User";
import type { Role } from "@/lib/rbac";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email?.trim() || !credentials?.password) {
          return null;
        }
        try {
          await connectDB();
          const user = await UserModel
            .findOne({ email: credentials.email.toLowerCase().trim() })
            .select("+password")
            .lean();
          if (!user) return null;
          if (user.isActive === false) return null;
          const passwordOk = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (!passwordOk) return null;
          return {
            id:    user._id.toString(),
            name:  user.name,
            email: user.email,
            role:  user.role as Role,
            image: user.avatarUrl ?? null,
          };
        } catch (err) {
          console.error("[authorize error]", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id   as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET ?? "fallback-secret-change-in-production",
};