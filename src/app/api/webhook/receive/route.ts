import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Email from "@/models/Email";
import Inbox from "@/models/Inbox";
import User from "@/models/User";

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

  await connectDB();

  const toAddress = Array.isArray(to) ? to[0] : to;
  const normalizedTo = toAddress.toLowerCase().trim();

  const inbox = await Inbox.findOne({ address: normalizedTo, isActive: true });
  if (!inbox) {
    return NextResponse.json({ error: "Inbox not found" }, { status: 404 });
  }

  const emailDoc = await Email.create({
    inboxId: inbox._id,
    userId: inbox.userId,
    from,
    fromName: body.fromName || "",
    to: normalizedTo,
    subject: subject || "(no subject)",
    text,
    html,
    attachments: attachments || [],
    messageId,
    rawHeaders,
    receivedAt: new Date(),
  });

  await Inbox.findByIdAndUpdate(inbox._id, { $inc: { emailCount: 1 } });
  await User.findByIdAndUpdate(inbox.userId, { $inc: { emailsReceived: 1 } });

  return NextResponse.json({ success: true, emailId: emailDoc._id });
}
