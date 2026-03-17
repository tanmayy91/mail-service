import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findUsers } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page   = parseInt(searchParams.get("page")  || "1");
  const limit  = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const skip   = (page - 1) * limit;

  let allUsers = findUsers();
  if (search) {
    const lower = search.toLowerCase();
    allUsers = allUsers.filter(
      u => u.username.toLowerCase().includes(lower) ||
           u.email.toLowerCase().includes(lower)
    );
  }
  allUsers = allUsers.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = allUsers.length;
  const users = allUsers.slice(skip, skip + limit).map(u => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = u;
    return safe;
  });

  return NextResponse.json({ users, total, page, limit });
}
