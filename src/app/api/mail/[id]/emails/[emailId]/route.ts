import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  findUser,
  findInboxById,
  findEmailById,
  updateEmail,
  deleteEmail,
  updateInbox,
} from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  const { id, emailId } = await params;
  const session = await auth();
  const apiKey = req.headers.get("x-api-key");

  let userId: string;
  if (apiKey) {
    const apiUser = findUser({ apiKey });
    if (!apiUser) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    userId = apiUser._id;
  } else if (session?.user?.id) {
    userId = session.user.id;
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inbox = findInboxById(id);
  if (!inbox || inbox.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = findEmailById(emailId);
  if (!email || email.inboxId !== id) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  updateEmail(emailId, { isRead: true });

  return NextResponse.json({ email });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  const { id, emailId } = await params;
  const session = await auth();

  let userId: string;
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inbox = findInboxById(id);
  if (!inbox || inbox.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deleted = deleteEmail(emailId);
  if (deleted) {
    updateInbox(id, { emailCount: Math.max(0, (inbox.emailCount || 1) - 1) });
  }

  return NextResponse.json({ success: true });
}
