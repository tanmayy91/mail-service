/**
 * IMAP listener service for temp-mail routing.
 *
 * Connects to the Mailcow catch-all inbox (catchall@novacloud.tech) via IMAP
 * IDLE and routes every incoming email to the matching user inbox stored in the
 * JSON database.
 *
 * Run standalone:  tsx services/imap.ts
 * Included in:     npm run start:all
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables (.env.local overrides .env)
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config();

// Import shared database helpers (relative path — no @/* alias needed)
import {
  findInbox,
  findEmails,
  createEmail,
  updateInbox,
  findUser,
  updateUser,
} from "../src/lib/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts email address strings from a mailparser address field (To / Cc).
 */
function extractAddresses(
  field: { value: Array<{ address?: string }> } | Array<{ value: Array<{ address?: string }> }> | undefined
): string[] {
  if (!field) return [];
  const addresses: string[] = [];

  const processGroup = (group: { value: Array<{ address?: string }> }) => {
    for (const entry of group.value ?? []) {
      if (entry.address) addresses.push(entry.address.toLowerCase().trim());
    }
  };

  if (Array.isArray(field)) {
    for (const group of field) processGroup(group);
  } else {
    processGroup(field);
  }

  return addresses;
}

// ─── Message processor ────────────────────────────────────────────────────────

async function processMessage(client: ImapFlow, uid: number): Promise<void> {
  try {
    // Fetch raw source for this UID
    const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
    if (!msg || !msg.source) return;

    const parsed = await simpleParser((msg as { source: Buffer }).source);
    const messageId = parsed.messageId ?? `uid-${uid}@imap`;

    // Dedup: skip if we already have an email with this messageId in the DB
    const duplicate = findEmails({ messageId });
    if (duplicate.length > 0) {
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      return;
    }

    // Collect all destination addresses from To and Cc headers
    const toAddresses: string[] = [
      ...extractAddresses(parsed.to as Parameters<typeof extractAddresses>[0]),
      ...extractAddresses(parsed.cc as Parameters<typeof extractAddresses>[0]),
    ];

    // Mailcow may add Delivered-To / X-Original-To headers for catch-all routing
    const deliveredTo = parsed.headers?.get("delivered-to");
    const xOriginalTo = parsed.headers?.get("x-original-to");
    if (deliveredTo) toAddresses.push(String(deliveredTo).toLowerCase().trim());
    if (xOriginalTo) toAddresses.push(String(xOriginalTo).toLowerCase().trim());

    const uniqueAddresses = [...new Set(toAddresses.filter(Boolean))];

    // Sender info
    const fromEntry = parsed.from?.value?.[0];
    const fromEmail = fromEntry?.address ?? "";
    const fromName = fromEntry?.name ?? "";

    // Attachments
    const attachments = (parsed.attachments ?? []).map((att) => ({
      filename: att.filename ?? "attachment",
      contentType: att.contentType ?? "application/octet-stream",
      size: att.size ?? 0,
      content: Buffer.isBuffer(att.content)
        ? att.content.toString("base64")
        : undefined,
    }));

    // Raw headers string
    const rawHeaders = parsed.headerLines
      ? parsed.headerLines.map((h) => h.line).join("\r\n")
      : undefined;

    let routed = false;

    for (const toAddr of uniqueAddresses) {
      const inbox = findInbox({ address: toAddr, isActive: true });
      if (!inbox) continue;

      createEmail({
        inboxId: inbox._id,
        userId: inbox.userId,
        from: fromEmail,
        fromName,
        to: toAddr,
        subject: parsed.subject ?? "(no subject)",
        text: parsed.text ?? undefined,
        html: typeof parsed.html === "string" ? parsed.html : undefined,
        attachments,
        isRead: false,
        isStarred: false,
        receivedAt: (parsed.date ?? new Date()).toISOString(),
        messageId,
        rawHeaders,
      });

      updateInbox(inbox._id, { emailCount: inbox.emailCount + 1 });

      const owner = findUser({ _id: inbox.userId });
      if (owner) {
        updateUser(inbox.userId, {
          emailsReceived: owner.emailsReceived + 1,
        });
      }

      routed = true;
      console.log(`[IMAP] ✓ Delivered "${parsed.subject}" → ${toAddr}`);
    }

    if (!routed) {
      console.log(
        `[IMAP] No matching inbox for: ${uniqueAddresses.join(", ")} (subject: "${parsed.subject}")`
      );
    }

    // Mark as Seen so we don't re-process on reconnect
    await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
  } catch (err) {
    console.error(`[IMAP] Error processing UID ${uid}:`, err);
  }
}

// ─── IMAP connection loop ─────────────────────────────────────────────────────

async function runOnce(): Promise<void> {
  const imapConfig = {
    host: process.env.IMAP_HOST ?? "mail.novacloud.tech",
    port: parseInt(process.env.IMAP_PORT ?? "993", 10),
    secure: process.env.IMAP_SECURE !== "false",
    auth: {
      user: process.env.IMAP_USER ?? "catchall@novacloud.tech",
      pass: process.env.IMAP_PASS ?? "",
    },
    // Suppress internal imapflow logs; we do our own logging
    logger: false as const,
  };

  const client = new ImapFlow(imapConfig);

  try {
    await client.connect();
    console.log(`[IMAP] Connected to ${imapConfig.host}:${imapConfig.port}`);

    const lock = await client.getMailboxLock("INBOX");
    try {
      // Process any messages that arrived while we were offline
      const unseenResult = await client.search({ seen: false }, { uid: true });
      const unseenUids = Array.isArray(unseenResult) ? unseenResult : [];
      if (unseenUids.length > 0) {
        console.log(`[IMAP] Processing ${unseenUids.length} unseen message(s)…`);
        for (const uid of unseenUids) {
          await processMessage(client, uid);
        }
      }

      // Enter IDLE loop — re-enter after each server notification / timeout
      console.log("[IMAP] Watching for new emails (IDLE)…");
      while (true) {
        // idle() resolves when the server sends a notification or the IDLE
        // timeout elapses (~29 min for most servers).
        await client.idle();

        // After IDLE breaks, process any new unseen messages
        const newResult = await client.search({ seen: false }, { uid: true });
        const newUids = Array.isArray(newResult) ? newResult : [];
        for (const uid of newUids) {
          await processMessage(client, uid);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

async function startIMAPService(): Promise<void> {
  const RECONNECT_DELAY_MS = 15_000;

  while (true) {
    try {
      await runOnce();
    } catch (err) {
      console.error("[IMAP] Connection lost:", (err as Error).message);
    }
    console.log(
      `[IMAP] Reconnecting in ${RECONNECT_DELAY_MS / 1000}s…`
    );
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
  }
}

startIMAPService().catch((err) => {
  console.error("[IMAP] Fatal error:", err);
  process.exit(1);
});
