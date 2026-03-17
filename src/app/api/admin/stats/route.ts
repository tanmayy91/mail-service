import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  findUsers,
  countUsers,
  countInboxes,
  countEmails,
  totalBalance,
  findTransactions,
} from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}

// GET /api/admin/stats
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userCount  = countUsers();
  const inboxCount = countInboxes({ isActive: true });
  const emailCount = countEmails();
  const balance    = totalBalance();

  const recentUsers = findUsers()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(({ _id, username, discordId, avatar, balance, plan, createdAt }) => ({
      _id, username, discordId, avatar, balance, plan, createdAt,
    }));

  const recentTransactions = findTransactions()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(tx => {
      const user = findUsers({ _id: tx.userId })[0];
      return { ...tx, userId: user ? { username: user.username } : tx.userId };
    });

  return NextResponse.json({
    stats: { userCount, inboxCount, emailCount, totalBalance: balance },
    recentUsers,
    recentTransactions,
  });
}
