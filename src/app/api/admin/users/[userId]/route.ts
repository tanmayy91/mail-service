import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findUser, updateUser, findLinks, findTransactions } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = findUser({ _id: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const links = findLinks({ userId, isActive: true });
  const transactions = findTransactions({ userId })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safeUser } = user;

  return NextResponse.json({ user: safeUser, links, transactions });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  const allowed = ["plan", "isActive", "balance"] as const;
  const update: Partial<Record<(typeof allowed)[number], unknown>> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const user = updateUser(userId, update as Parameters<typeof updateUser>[1]);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}
