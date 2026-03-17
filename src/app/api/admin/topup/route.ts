import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findUser, updateUser, createTransaction } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId, amount, description } = body;

  if (!userId || !amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "Invalid userId or amount" },
      { status: 400 }
    );
  }

  const user = findUser({ _id: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const balanceBefore = user.balance;
  const balanceAfter  = balanceBefore + amount;

  updateUser(userId, { balance: balanceAfter });

  createTransaction({
    userId,
    type: "topup",
    amount,
    balanceBefore,
    balanceAfter,
    description: description || `Admin top-up: $${amount}`,
    performedBy: session.user.id,
  });

  return NextResponse.json({ success: true, newBalance: balanceAfter });
}
