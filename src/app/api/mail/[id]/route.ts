import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Inbox from "@/models/Inbox";
import Email from "@/models/Email";
import User from "@/models/User";

// GET /api/mail/[id] - get emails for an inbox
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const apiKey = req.headers.get("x-api-key");

  await connectDB();

  let userId: string;
  if (apiKey) {
    const apiUser = await User.findOne({ apiKey });
    if (!apiUser) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    userId = apiUser._id.toString();
  } else if (session?.user?.id) {
    userId = session.user.id;
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inbox = await Inbox.findById(id);
  if (!inbox) {
    return NextResponse.json({ error: "Inbox not found" }, { status: 404 });
  }

  if (inbox.userId.toString() !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const [emails, total] = await Promise.all([
    Email.find({ inboxId: id })
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-html -text -rawHeaders"),
    Email.countDocuments({ inboxId: id }),
  ]);

  return NextResponse.json({ emails, total, page, limit });
}

// DELETE /api/mail/[id] - delete an inbox
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const inbox = await Inbox.findById(id);
  if (!inbox) {
    return NextResponse.json({ error: "Inbox not found" }, { status: 404 });
  }

  if (inbox.userId.toString() !== session.user.id && !session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Inbox.findByIdAndUpdate(id, { isActive: false });
  await Email.deleteMany({ inboxId: id });
  await User.findByIdAndUpdate(inbox.userId, { $inc: { inboxCount: -1 } });

  return NextResponse.json({ success: true });
}
