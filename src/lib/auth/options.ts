/**
 * lib/auth/options.ts
 *
 * Key fixes vs previous version:
 *  - authorize() returns null instead of throwing — NextAuth requires null for
 *    auth failure; thrown errors cause silent 401s that are hard to debug
 *  - bcrypt.compare called directly (no instance method) — avoids model cache
 *    issues where comparePassword is undefined on a stale cached model
 *  - NEXTAUTH_SECRET check with clear error message
 */

import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import UserModel from "@/models/User";
import type { Role } from "@/lib/rbac";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not set in .env.local");
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        // 1. Basic input check
        if (!credentials?.email?.trim() || !credentials?.password) {
          return null;
        }

        try {
          await connectDB();

          // 2. Find user — must explicitly select password (select: false on schema)
          const user = await UserModel
            .findOne({ email: credentials.email.toLowerCase().trim() })
            .select("+password")
            .lean();   // lean() returns plain object — faster, no method issues

          if (!user) return null;

          // 3. Check account is active
          if (user.isActive === false) return null;

          // 4. Compare password directly with bcrypt — no instance method needed
          const passwordOk = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (!passwordOk) return null;

          // 5. Return the plain user object NextAuth needs
          return {
            id:    user._id.toString(),
            name:  user.name,
            email: user.email,
            role:  user.role as Role,
            image: user.avatarUrl ?? null,
          };

        } catch (err) {
          console.error("[authorize error]", err);
          return null;  // never throw — always return null on failure
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

  secret: process.env.NEXTAUTH_SECRET,
};
