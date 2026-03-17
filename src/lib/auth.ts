import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { generateApiKey } from "@/lib/utils";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    Credentials({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === process.env.ADMIN_USERNAME &&
          credentials?.password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id: "admin",
            name: process.env.ADMIN_USERNAME,
            email: "admin@system.local",
            isAdmin: true,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "discord") {
        try {
          await connectDB();
          const existing = await User.findOne({ discordId: user.id });
          if (!existing) {
            await User.create({
              discordId: user.id,
              username: user.name || "Discord User",
              email: user.email,
              avatar: user.image,
              apiKey: generateApiKey(),
              balance: 0,
            });
          } else {
            await User.findOneAndUpdate(
              { discordId: user.id },
              {
                username: user.name || existing.username,
                avatar: user.image,
                lastLogin: new Date(),
              }
            );
          }
        } catch (err) {
          console.error("SignIn error:", err);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "discord") {
        token.discordId = token.sub;
      }
      if (user && "isAdmin" in user && user.isAdmin) {
        token.isAdmin = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.discordId) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ discordId: token.discordId });
          if (dbUser) {
            session.user.id = dbUser._id.toString();
            session.user.discordId = dbUser.discordId;
            session.user.isAdmin = dbUser.isAdmin;
            session.user.balance = dbUser.balance;
            session.user.apiKey = dbUser.apiKey;
            session.user.plan = dbUser.plan;
          }
        } catch (err) {
          console.error("Session error:", err);
        }
      }
      if (token.isAdmin) {
        session.user.isAdmin = true;
        session.user.id = "admin";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
