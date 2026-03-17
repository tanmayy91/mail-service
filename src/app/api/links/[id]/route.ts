import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findUser, findLinkById, updateLink, deleteLink } from "@/lib/db";

async function resolveUser(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const user = findUser({ apiKey });
    return user ?? null;
  }
  const session = await auth();
  if (session?.user?.id) {
    return findUser({ _id: session.user.id }) ?? null;
  }
  return null;
}

// GET /api/links/[id] — get link details / stats
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const link = findLinkById(id);
  if (!link || link.userId !== user._id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ link });
}

// PATCH /api/links/[id] — update title or active state
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const link = findLinkById(id);
  if (!link || link.userId !== user._id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { title?: string; isActive?: boolean };
  const allowed: Record<string, unknown> = {};
  if (typeof body.title === "string") allowed.title = body.title;
  if (typeof body.isActive === "boolean") allowed.isActive = body.isActive;

  const updated = updateLink(id, allowed);
  return NextResponse.json({ link: updated });
}

// DELETE /api/links/[id] — soft-delete a link
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const link = findLinkById(id);
  if (!link || link.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  deleteLink(id);
  return NextResponse.json({ success: true });
}
