import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Inbox from "@/models/Inbox";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const [user, inboxes, transactions] = await Promise.all([
    User.findById(userId),
    Inbox.find({ userId, isActive: true }),
    Transaction.find({ userId }).sort({ createdAt: -1 }).limit(20),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user, inboxes, transactions });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json().catch(() => ({}));

  const allowedFields = ["plan", "isActive", "balance"];
  const updateData: Record<string, unknown> = {};

  for (const key of allowedFields) {
    if (key in body) {
      updateData[key] = body[key];
    }
  }

  const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
