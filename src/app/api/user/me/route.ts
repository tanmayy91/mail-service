import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Inbox from "@/models/Inbox";
import Transaction from "@/models/Transaction";
import { generateApiKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  const apiKey = req.headers.get("x-api-key");

  await connectDB();

  let dbUser;
  if (apiKey) {
    dbUser = await User.findOne({ apiKey });
    if (!dbUser) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
  } else if (session?.user?.id) {
    if (session.user.id === "admin") {
      return NextResponse.json({
        user: {
          id: "admin",
          username: process.env.ADMIN_USERNAME,
          isAdmin: true,
          balance: 0,
          plan: "enterprise",
        },
      });
    }
    dbUser = await User.findById(session.user.id);
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const inboxCount = await Inbox.countDocuments({
    userId: dbUser._id,
    isActive: true,
  });
  const recentTransactions = await Transaction.find({ userId: dbUser._id })
    .sort({ createdAt: -1 })
    .limit(5);

  return NextResponse.json({
    user: {
      ...dbUser.toObject(),
      inboxCount,
      recentTransactions,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await req.json().catch(() => ({}));

  const allowedFields: Record<string, boolean> = { username: true };
  const updateData: Record<string, string> = {};

  for (const key in body) {
    if (allowedFields[key]) {
      updateData[key] = body[key];
    }
  }

  const user = await User.findByIdAndUpdate(session.user.id, updateData, {
    new: true,
  });
  return NextResponse.json({ user });
}

// POST /api/user/me - regenerate API key
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.action !== "regenerate-api-key") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await connectDB();
  const newKey = generateApiKey();
  const user = await User.findByIdAndUpdate(
    session.user.id,
    { apiKey: newKey },
    { new: true }
  );

  return NextResponse.json({ apiKey: user?.apiKey });
}
