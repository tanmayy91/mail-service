import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

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
          await connectDB();
          const user = await User.findOne({ email: credentials.email })
            .select("+password");
          if (!user || !user.isActive) return null;
          const valid = await user.comparePassword(credentials.password as string);
          if (!valid) return null;
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
          return {
            id:      user._id.toString(),
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
          await connectDB();
          const dbUser = await User.findById(token.id);
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
