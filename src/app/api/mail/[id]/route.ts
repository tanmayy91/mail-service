import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  findUser,
  findInboxById,
  findEmails,
  updateInbox,
  updateUser,
  deleteEmailsByInbox,
} from "@/lib/db";
import { deleteAlias, isMailcowConfigured } from "@/lib/mailcow";

// GET /api/mail/[id] - get emails for an inbox
export async function GET(
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

  const { searchParams } = new URL(req.url);
  const page  = parseInt(searchParams.get("page")  || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip  = (page - 1) * limit;

  const allEmails = findEmails({ inboxId: id })
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

  const total  = allEmails.length;
  const emails = allEmails.slice(skip, skip + limit).map(e => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { html, text, rawHeaders, ...rest } = e;
    return rest;
  });

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

  const inbox = findInboxById(id);
  if (!inbox) {
    return NextResponse.json({ error: "Inbox not found" }, { status: 404 });
  }

  if (inbox.userId !== session.user.id && !session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  updateInbox(id, { isActive: false });
  deleteEmailsByInbox(id);

  const owner = findUser({ _id: inbox.userId });
  if (owner) {
    updateUser(owner._id, { inboxCount: Math.max(0, (owner.inboxCount || 1) - 1) });
  }

  // Remove alias from Mailcow (best-effort).
  if (isMailcowConfigured()) {
    await deleteAlias(inbox.address).catch(() => null);
  }

  return NextResponse.json({ success: true });
}
