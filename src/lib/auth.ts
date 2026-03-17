import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findUser, updateUser, comparePassword } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // ── trustHost ────────────────────────────────────────────────────────────
  // REQUIRED for Railway / custom domains.
  // NextAuth v5 reads the host from the incoming `host` / `x-forwarded-host`
  // header. Railway reverse-proxies requests and sets x-forwarded-host to
  // your custom domain, so trustHost:true makes OAuth callbacks and CSRF
  // checks work correctly without hard-coding a URL.
  trustHost: true,

  providers: [
    // ── User login (email + password, created by Discord bot) ────────────
    Credentials({
      id: "credentials",
      name: "Email / Password",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = findUser({ email: (credentials.email as string).toLowerCase() });
          if (!user || !user.isActive) return null;
          const valid = await comparePassword(user, credentials.password as string);
          if (!valid) return null;
          updateUser(user._id, { lastLogin: new Date().toISOString() });
          return {
            id:      user._id,
            email:   user.email,
            name:    user.username,
            image:   user.avatar ?? null,
            isAdmin: user.isAdmin,
          };
        } catch (err) {
          console.error("Auth error:", err);
          return null;
        }
      },
    }),

    // ── Admin login (env credentials) ────────────────────────────────────
    Credentials({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text"     },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === process.env.ADMIN_USERNAME &&
          credentials?.password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id:      "admin",
            name:    process.env.ADMIN_USERNAME ?? "Admin",
            email:   "admin@system.local",
            isAdmin: true,
          };
        }
        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id      = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id      = token.id      as string;
      session.user.isAdmin = (token.isAdmin as boolean) ?? false;

      if (token.id && token.id !== "admin") {
        try {
          const dbUser = findUser({ _id: token.id as string });
          if (dbUser) {
            session.user.balance = dbUser.balance;
            session.user.apiKey  = dbUser.apiKey;
            session.user.plan    = dbUser.plan;
          }
        } catch (err) {
          console.error("Session DB error:", err);
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },
  session: { strategy: "jwt" },
  secret:  process.env.NEXTAUTH_SECRET,
});
