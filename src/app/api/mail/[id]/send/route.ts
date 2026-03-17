import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findUser, findInboxById, createEmail } from "@/lib/db";
import nodemailer from "nodemailer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  if (!inbox) {
    return NextResponse.json({ error: "Inbox not found" }, { status: 404 });
  }
  if (inbox.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { to, subject, text, html } = body as {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };

  if (!to || !subject) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject" },
      { status: 400 }
    );
  }
  if (!text && !html) {
    return NextResponse.json(
      { error: "Message body is required" },
      { status: 400 }
    );
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpSecure = process.env.SMTP_SECURE === "true";
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json(
      { error: "Outbound mail is not configured on this server" },
      { status: 503 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.sendMail({
      from: inbox.address,
      to,
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
    });
  } catch (err) {
    console.error("SMTP send error:", err);
    return NextResponse.json(
      { error: "Failed to send email. Check SMTP configuration." },
      { status: 500 }
    );
  }

  const emailDoc = createEmail({
    inboxId: inbox._id,
    userId: inbox.userId,
    from: inbox.address,
    to,
    subject,
    text,
    html,
    attachments: [],
    isRead: true,
    isStarred: false,
    receivedAt: new Date().toISOString(),
    direction: "sent",
  });

  return NextResponse.json({ success: true, emailId: emailDoc._id });
}
