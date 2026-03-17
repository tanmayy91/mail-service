import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Inbox from "@/models/Inbox";
import Email from "@/models/Email";
import Transaction from "@/models/Transaction";

async function requireAdmin(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return null;
  }
  return session;
}

// GET /api/admin/stats
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const [userCount, inboxCount, emailCount, totalBalanceResult] =
    await Promise.all([
      User.countDocuments(),
      Inbox.countDocuments({ isActive: true }),
      Email.countDocuments(),
      User.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]),
    ]);

  const totalBalance = totalBalanceResult[0]?.total || 0;

  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("username discordId avatar balance plan createdAt");

  const recentTransactions = await Transaction.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("userId", "username");

  return NextResponse.json({
    stats: {
      userCount,
      inboxCount,
      emailCount,
      totalBalance,
    },
    recentUsers,
    recentTransactions,
  });
}
