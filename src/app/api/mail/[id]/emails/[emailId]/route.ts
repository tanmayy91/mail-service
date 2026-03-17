import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Email from "@/models/Email";
import Inbox from "@/models/Inbox";
import User from "@/models/User";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  const { id, emailId } = await params;
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
  if (!inbox || inbox.userId.toString() !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = await Email.findById(emailId);
  if (!email || email.inboxId.toString() !== id) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  await Email.findByIdAndUpdate(emailId, { isRead: true });

  return NextResponse.json({ email });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  const { id, emailId } = await params;
  const session = await auth();

  await connectDB();

  let userId: string;
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inbox = await Inbox.findById(id);
  if (!inbox || inbox.userId.toString() !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = await Email.findByIdAndDelete(emailId);
  if (email) {
    await Inbox.findByIdAndUpdate(id, { $inc: { emailCount: -1 } });
  }

  return NextResponse.json({ success: true });
}
