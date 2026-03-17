import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Inbox from "@/models/Inbox";
import User from "@/models/User";
import { generateLocalPart } from "@/lib/utils";

const MAIL_DOMAIN = process.env.MAIL_DOMAIN || "mail.example.com";

// GET /api/mail - list user's inboxes
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Support API key auth
  const apiKey = req.headers.get("x-api-key");
  let userId = session.user.id;

  if (apiKey) {
    await connectDB();
    const apiUser = await User.findOne({ apiKey });
    if (!apiUser) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    userId = apiUser._id.toString();
  } else {
    await connectDB();
  }

  const inboxes = await Inbox.find({ userId, isActive: true }).sort({
    createdAt: -1,
  });

  return NextResponse.json({ inboxes });
}

// POST /api/mail - create a new inbox
export async function POST(req: NextRequest) {
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
    dbUser = await User.findById(session.user.id);
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check plan limits
  const inboxCount = await Inbox.countDocuments({
    userId: dbUser._id,
    isActive: true,
  });
  const planLimits: Record<string, number> = {
    free: 3,
    starter: 10,
    pro: 50,
    enterprise: Infinity,
  };
  const limit = planLimits[dbUser.plan] ?? 3;

  if (inboxCount >= limit) {
    return NextResponse.json(
      { error: `Inbox limit reached for your plan (${limit})` },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const localPart = body.localPart
    ? body.localPart.toLowerCase().replace(/[^a-z0-9._-]/g, "")
    : generateLocalPart();
  const domain = body.domain || MAIL_DOMAIN;
  const address = `${localPart}@${domain}`;

  // Check if address already exists
  const exists = await Inbox.findOne({ address });
  if (exists) {
    return NextResponse.json(
      { error: "Address already taken" },
      { status: 409 }
    );
  }

  const inbox = await Inbox.create({
    userId: dbUser._id,
    address,
    domain,
    localPart,
  });

  await User.findByIdAndUpdate(dbUser._id, { $inc: { inboxCount: 1 } });

  return NextResponse.json({ inbox }, { status: 201 });
}
