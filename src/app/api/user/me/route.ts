import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  findUser,
  updateUser,
  countLinks,
  findTransactions,
} from "@/lib/db";
import { generateApiKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  const apiKey = req.headers.get("x-api-key");

  let dbUser;
  if (apiKey) {
    dbUser = findUser({ apiKey });
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
    dbUser = findUser({ _id: session.user.id });
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const linkCount = countLinks({ userId: dbUser._id, isActive: true });
  const recentTransactions = findTransactions({ userId: dbUser._id })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Omit password from response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safeUser } = dbUser;

  return NextResponse.json({
    user: { ...safeUser, linkCount, recentTransactions },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const allowed = ["username"] as const;
  const update: Partial<Record<(typeof allowed)[number], string>> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const user = updateUser(session.user.id, update);
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

  const newKey = generateApiKey();
  const user = updateUser(session.user.id, { apiKey: newKey });

  return NextResponse.json({ apiKey: user?.apiKey });
}
