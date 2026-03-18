import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  findUser,
  findInboxes,
  createInbox,
  countInboxes,
  updateUser,
} from "@/lib/db";
import { generateLocalPart } from "@/lib/utils";
import { createAlias, isMailcowConfigured } from "@/lib/mailcow";

const MAIL_DOMAIN = process.env.MAIL_DOMAIN || "novacloud.tech";

// GET /api/mail - list user's inboxes
export async function GET(req: NextRequest) {
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

  const inboxes = findInboxes({ userId, isActive: true })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ inboxes });
}

// POST /api/mail - create a new inbox
export async function POST(req: NextRequest) {
  const session = await auth();
  const apiKey = req.headers.get("x-api-key");

  let dbUser;
  if (apiKey) {
    dbUser = findUser({ apiKey });
    if (!dbUser) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
  } else if (session?.user?.id) {
    dbUser = findUser({ _id: session.user.id });
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check plan limits
  const inboxCount = countInboxes({ userId: dbUser._id, isActive: true });
  const planLimits: Record<string, number> = {
    none: 0,
    free: 3,
    starter: 10,
    pro: 50,
    enterprise: Infinity,
    custom: Infinity,
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
  const exists = findInboxes({ address });
  if (exists.length > 0) {
    return NextResponse.json(
      { error: "Address already taken" },
      { status: 409 }
    );
  }

  const inbox = createInbox({
    userId: dbUser._id,
    address,
    domain,
    localPart,
    isActive: true,
    emailCount: 0,
  });

  updateUser(dbUser._id, { inboxCount: (dbUser.inboxCount || 0) + 1 });

  // Provision alias on Mailcow so the IMAP catch-all routes to this address.
  // This is best-effort — inbox is still usable if Mailcow is not configured.
  if (isMailcowConfigured()) {
    await createAlias(address).catch(() => null);
  }

  return NextResponse.json({ inbox }, { status: 201 });
}
