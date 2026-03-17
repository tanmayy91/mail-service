import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  findUser,
  findLinks,
  createLink,
  countLinks,
  updateUser,
} from "@/lib/db";
import { generateSlug } from "@/lib/utils";

const PLAN_LIMITS: Record<string, number> = {
  none: 0,
  free: 10,
  starter: 100,
  pro: 500,
  enterprise: Infinity,
  custom: Infinity,
};

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

// GET /api/links — list user's links
export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = findLinks({ userId: user._id, isActive: true })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ links });
}

// POST /api/links — create a short link
export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const linkCount = countLinks({ userId: user._id, isActive: true });
  const limit = PLAN_LIMITS[user.plan] ?? 10;

  if (linkCount >= limit) {
    return NextResponse.json(
      { error: `Link limit reached for your plan (${limit})` },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({})) as {
    url?: string;
    slug?: string;
    title?: string;
    expiresAt?: string;
  };

  if (!body.url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Basic URL validation
  try {
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Resolve slug
  const slug = body.slug
    ? body.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "")
    : generateSlug();

  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  // Check uniqueness
  const existing = findLinks({ slug });
  if (existing.length > 0) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  const link = createLink({
    userId: user._id,
    slug,
    url: body.url,
    title: body.title,
    clicks: 0,
    isActive: true,
    expiresAt: body.expiresAt,
  });

  updateUser(user._id, { linkCount: (user.linkCount || 0) + 1 });

  return NextResponse.json({ link }, { status: 201 });
}
