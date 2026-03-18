import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isMailcowConfigured,
  getMailcowServerInfo,
  getDomains,
  getMailboxes,
  createDomain,
  deleteDomain,
  createMailbox,
  deleteMailbox,
} from "@/lib/mailcow";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}

// GET /api/admin/mailcow
// Returns Mailcow server info, domains, and mailboxes.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isMailcowConfigured()) {
    return NextResponse.json(
      { configured: false, error: "Mailcow not configured (set MAILCOW_URL and MAILCOW_API_KEY)" },
      { status: 200 }
    );
  }

  const [serverInfo, domains, mailboxes] = await Promise.all([
    getMailcowServerInfo(),
    getDomains(),
    getMailboxes(),
  ]);

  return NextResponse.json({
    configured: true,
    serverInfo,
    domains,
    mailboxes,
  });
}

// POST /api/admin/mailcow
// Body: { action, ...params }
//
// Supported actions:
//   create_domain  – { domain, description?, maxAliases?, maxMailboxes?, maxQuota? }
//   delete_domain  – { domain }
//   create_mailbox – { localPart, domain, name, password, quotaMb? }
//   delete_mailbox – { address }
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isMailcowConfigured()) {
    return NextResponse.json(
      { error: "Mailcow not configured (set MAILCOW_URL and MAILCOW_API_KEY)" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string };

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  switch (action) {
    case "create_domain": {
      const { domain, description, maxAliases, maxMailboxes, maxQuota } = body as {
        domain?: string;
        description?: string;
        maxAliases?: number;
        maxMailboxes?: number;
        maxQuota?: number;
      };
      if (!domain) {
        return NextResponse.json({ error: "domain is required" }, { status: 400 });
      }
      const ok = await createDomain(domain, { description, maxAliases, maxMailboxes, maxQuota });
      return NextResponse.json({ success: ok }, ok ? { status: 201 } : { status: 502 });
    }

    case "delete_domain": {
      const { domain } = body as { domain?: string };
      if (!domain) {
        return NextResponse.json({ error: "domain is required" }, { status: 400 });
      }
      const ok = await deleteDomain(domain);
      return NextResponse.json({ success: ok }, ok ? undefined : { status: 502 });
    }

    case "create_mailbox": {
      const { localPart, domain, name, password, quotaMb } = body as {
        localPart?: string;
        domain?: string;
        name?: string;
        password?: string;
        quotaMb?: number;
      };
      if (!localPart || !domain || !name || !password) {
        return NextResponse.json(
          { error: "localPart, domain, name and password are required" },
          { status: 400 }
        );
      }
      const ok = await createMailbox({ localPart, domain, name, password, quotaMb });
      return NextResponse.json({ success: ok }, ok ? { status: 201 } : { status: 502 });
    }

    case "delete_mailbox": {
      const { address } = body as { address?: string };
      if (!address) {
        return NextResponse.json({ error: "address is required" }, { status: 400 });
      }
      const ok = await deleteMailbox(address);
      return NextResponse.json({ success: ok }, ok ? undefined : { status: 502 });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
