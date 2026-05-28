import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

function resolveAuthSecret(): string | undefined {
  const explicit =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (explicit && explicit.length > 0) {
    return explicit;
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[auth] AUTH_SECRET or NEXTAUTH_SECRET must be set in production.",
    );
    return undefined;
  }

  console.warn(
    "[auth] AUTH_SECRET (or NEXTAUTH_SECRET) is unset — using a fixed dev fallback. Add AUTH_SECRET to .env.local for stable JWT signing.",
  );
  // Same dev fallback every run so restarting the dev server keeps sessions decryptable locally.
  return "local-dev-locker-room-auth-secret-at-least-thirty-two-chars";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });
          if (!user) return null;

          const ok = await bcrypt.compare(
            parsed.data.password,
            user.passwordHash
          );
          if (!ok) return null;

          return { id: user.id, email: user.email, name: user.name ?? "" };
        } catch (e) {
          console.error("[auth] Database error during authorize:", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { name: true, email: true },
          });
          if (user) {
            session.user.name = user.name ?? "";
            session.user.email = user.email;
          }
        } catch (e) {
          console.error("[auth] Failed to load user for session:", e);
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: resolveAuthSecret(),
  pages: {
    signIn: "/login",
  },
});
