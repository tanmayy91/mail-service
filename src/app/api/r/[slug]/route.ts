import { NextRequest, NextResponse } from "next/server";
import { findLink, updateLink } from "@/lib/db";

// GET /api/r/[slug] — redirect to the original URL and increment click count
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const link = findLink({ slug, isActive: true });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Check expiry
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    updateLink(link._id, { isActive: false });
    return NextResponse.json({ error: "Link has expired" }, { status: 410 });
  }

  // Increment click count asynchronously (best-effort)
  updateLink(link._id, { clicks: link.clicks + 1 });

  return NextResponse.redirect(link.url, { status: 302 });
}
