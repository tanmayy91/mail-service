import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";
import { DATA_DIR } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const apiKey = req.headers.get("x-api-key");
  if (!session?.user?.isAdmin && !apiKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const healthPath = path.join(DATA_DIR, "imap-health.json");
  try {
    const raw = fs.readFileSync(healthPath, "utf-8");
    return NextResponse.json({ imap: JSON.parse(raw) });
  } catch {
    return NextResponse.json({
      imap: { status: "unknown", lastError: "Health file not found" },
    });
  }
}
