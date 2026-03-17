import { NextRequest, NextResponse } from "next/server";
import { findUser, findInbox, createEmail, updateInbox, updateUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET && process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { from, to, subject, text, html, attachments, messageId, rawHeaders } =
    body;

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from or to fields" },
      { status: 400 }
    );
  }

  const toAddress   = Array.isArray(to) ? to[0] : to;
  const normalizedTo = toAddress.toLowerCase().trim();

  const inbox = findInbox({ address: normalizedTo, isActive: true });
  if (!inbox) {
    return NextResponse.json({ error: "Inbox not found" }, { status: 404 });
  }

  const emailDoc = createEmail({
    inboxId: inbox._id,
    userId: inbox.userId,
    from,
    fromName: body.fromName || "",
    to: normalizedTo,
    subject: subject || "(no subject)",
    text,
    html,
    attachments: attachments || [],
    isRead: false,
    isStarred: false,
    receivedAt: new Date().toISOString(),
    messageId,
    rawHeaders,
  });

  updateInbox(inbox._id, { emailCount: (inbox.emailCount || 0) + 1 });

  const owner = findUser({ _id: inbox.userId });
  if (owner) {
    updateUser(inbox.userId, { emailsReceived: (owner.emailsReceived || 0) + 1 });
  }

  return NextResponse.json({ success: true, emailId: emailDoc._id });
}
