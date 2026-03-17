/**
 * IMAP listener service for temp-mail routing.
 *
 * Connects to the Mailcow catch-all inbox (catchall@novacloud.tech) via IMAP
 * IDLE and routes every incoming email to the matching active user inbox
 * stored in the JSON database.
 *
 * Features:
 *  - IMAP IDLE for instant delivery notification (no polling gap)
 *  - Exponential back-off reconnection (5 s → 60 s)
 *  - Graceful SIGTERM / SIGINT shutdown
 *  - Health-file writer (data/imap-health.json) — read by /api/imap/status
 *  - Structured, timestamped console logging
 *  - Message-ID deduplication to prevent double-processing on reconnect
 *  - Routes by To / Cc / Delivered-To / X-Original-To headers
 *
 * Run standalone:  tsx services/imap.ts
 * Included in:     npm run start:all
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config();

import {
  findInbox,
  findEmails,
  createEmail,
  updateInbox,
  findUser,
  updateUser,
  DATA_DIR,
} from "../src/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImapHealth {
  status: "connected" | "disconnected" | "error";
  host: string;
  port: number;
  connectedAt: string | null;
  lastActivity: string | null;
  lastError: string | null;
  messagesProcessed: number;
  updatedAt: string;
}

// ─── Globals ──────────────────────────────────────────────────────────────────

let messagesProcessed = 0;
let isShuttingDown = false;
const HEALTH_PATH = path.join(DATA_DIR, "imap-health.json");

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(level: "INFO" | "WARN" | "ERROR", msg: string, extra?: unknown): void {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [IMAP/${level}]`;
  if (level === "ERROR") {
    console.error(prefix, msg, extra !== undefined ? extra : "");
  } else if (level === "WARN") {
    console.warn(prefix, msg, extra !== undefined ? extra : "");
  } else {
    console.log(prefix, msg, extra !== undefined ? extra : "");
  }
}

// ─── Health file ──────────────────────────────────────────────────────────────

function writeHealth(patch: Partial<ImapHealth>): void {
  try {
    const existing: Partial<ImapHealth> = (() => {
      try { return JSON.parse(fs.readFileSync(HEALTH_PATH, "utf-8")); } catch { return {}; }
    })();
    const next: ImapHealth = {
      status: "disconnected",
      host: process.env.IMAP_HOST ?? "mail.novacloud.tech",
      port: parseInt(process.env.IMAP_PORT ?? "993", 10),
      connectedAt: null,
      lastActivity: null,
      lastError: null,
      messagesProcessed,
      updatedAt: new Date().toISOString(),
      ...existing,
      ...patch,
      messagesProcessed,
      updatedAt: new Date().toISOString(),
    };
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HEALTH_PATH, JSON.stringify(next, null, 2), "utf-8");
  } catch (err) {
    log("WARN", "Failed to write health file", err);
  }
}

// ─── Address helpers ─────────────────────────────────────────────────────────

type AddressField =
  | { value: Array<{ address?: string }> }
  | Array<{ value: Array<{ address?: string }> }>
  | undefined;

function extractAddresses(field: AddressField): string[] {
  if (!field) return [];
  const out: string[] = [];
  const process_ = (g: { value: Array<{ address?: string }> }) => {
    for (const e of g.value ?? []) {
      if (e.address) out.push(e.address.toLowerCase().trim());
    }
  };
  if (Array.isArray(field)) {
    for (const g of field) process_(g);
  } else {
    process_(field);
  }
  return out;
}

// ─── Message processor ────────────────────────────────────────────────────────

async function processMessage(client: ImapFlow, uid: number): Promise<void> {
  try {
    const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
    if (!msg || !msg.source) return;

    const parsed = await simpleParser((msg as { source: Buffer }).source);
    const messageId = parsed.messageId ?? `uid-${uid}-${Date.now()}@imap`;

    // Dedup: skip if already stored
    if (findEmails({ messageId }).length > 0) {
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      return;
    }

    // Gather destination addresses (multiple sources for catch-all routing)
    const toAddresses: string[] = [
      ...extractAddresses(parsed.to as AddressField),
      ...extractAddresses(parsed.cc as AddressField),
    ];
    const deliveredTo = parsed.headers?.get("delivered-to");
    const xOriginalTo = parsed.headers?.get("x-original-to");
    if (deliveredTo) toAddresses.push(String(deliveredTo).toLowerCase().trim());
    if (xOriginalTo) toAddresses.push(String(xOriginalTo).toLowerCase().trim());
    const uniqueAddresses = [...new Set(toAddresses.filter(Boolean))];

    const fromEntry = parsed.from?.value?.[0];
    const fromEmail = fromEntry?.address ?? "";
    const fromName  = fromEntry?.name ?? "";

    const attachments = (parsed.attachments ?? []).map((att) => ({
      filename:    att.filename ?? "attachment",
      contentType: att.contentType ?? "application/octet-stream",
      size:        att.size ?? 0,
      content: Buffer.isBuffer(att.content)
        ? att.content.toString("base64")
        : undefined,
    }));

    const rawHeaders = parsed.headerLines
      ? parsed.headerLines.map((h) => h.line).join("\r\n")
      : undefined;

    let routed = false;

    for (const toAddr of uniqueAddresses) {
      const inbox = findInbox({ address: toAddr, isActive: true });
      if (!inbox) continue;

      createEmail({
        inboxId:    inbox._id,
        userId:     inbox.userId,
        from:       fromEmail,
        fromName,
        to:         toAddr,
        subject:    parsed.subject ?? "(no subject)",
        text:       parsed.text ?? undefined,
        html:       typeof parsed.html === "string" ? parsed.html : undefined,
        attachments,
        isRead:     false,
        isStarred:  false,
        receivedAt: (parsed.date ?? new Date()).toISOString(),
        messageId,
        rawHeaders,
      });

      updateInbox(inbox._id, { emailCount: inbox.emailCount + 1 });

      const owner = findUser({ _id: inbox.userId });
      if (owner) {
        updateUser(inbox.userId, { emailsReceived: owner.emailsReceived + 1 });
      }

      routed = true;
      messagesProcessed++;
      log("INFO", `Delivered "${parsed.subject}" → ${toAddr}`);
    }

    if (!routed) {
      log("INFO", `No matching inbox for [${uniqueAddresses.join(", ")}] — subject: "${parsed.subject}"`);
    }

    await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
    writeHealth({ lastActivity: new Date().toISOString() });
  } catch (err) {
    log("ERROR", `Failed to process UID ${uid}`, err);
  }
}

// ─── Single IMAP session ──────────────────────────────────────────────────────

async function runSession(): Promise<void> {
  const host   = process.env.IMAP_HOST ?? "mail.novacloud.tech";
  const port   = parseInt(process.env.IMAP_PORT ?? "993", 10);
  const secure = process.env.IMAP_SECURE !== "false";
  const user   = process.env.IMAP_USER ?? "catchall@novacloud.tech";
  const pass   = process.env.IMAP_PASS ?? "";

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: false as const,
  });

  try {
    await client.connect();
    log("INFO", `Connected to ${host}:${port} as ${user}`);
    writeHealth({ status: "connected", connectedAt: new Date().toISOString(), lastError: null });

    const lock = await client.getMailboxLock("INBOX");
    try {
      // Process unseen messages that arrived while the service was offline
      const unseenResult = await client.search({ seen: false }, { uid: true });
      const unseenUids = Array.isArray(unseenResult) ? unseenResult : [];
      if (unseenUids.length > 0) {
        log("INFO", `Processing ${unseenUids.length} unseen message(s) from backlog…`);
        for (const uid of unseenUids) {
          if (isShuttingDown) break;
          await processMessage(client, uid);
        }
      }

      // IDLE loop — server sends a notification or times out (~29 min); we re-enter
      log("INFO", "Entering IDLE — waiting for new mail…");
      while (!isShuttingDown) {
        await client.idle();

        const newResult = await client.search({ seen: false }, { uid: true });
        const newUids = Array.isArray(newResult) ? newResult : [];
        for (const uid of newUids) {
          if (isShuttingDown) break;
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

// ─── Service loop with exponential back-off ───────────────────────────────────

async function startService(): Promise<void> {
  const MIN_DELAY_MS  =  5_000;
  const MAX_DELAY_MS  = 60_000;
  let   delayMs       = MIN_DELAY_MS;

  writeHealth({ status: "disconnected", lastError: null });

  while (!isShuttingDown) {
    try {
      await runSession();
      // Clean exit (shutdown flag set) — break out of the loop
      if (isShuttingDown) break;
      // runSession returned without error — unusual; reset back-off
      delayMs = MIN_DELAY_MS;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("WARN", `Session ended with error: ${msg}`);
      writeHealth({ status: "error", lastError: msg });

      if (isShuttingDown) break;

      log("INFO", `Reconnecting in ${delayMs / 1000}s…`);
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, delayMs);
        // Allow shutdown signal to interrupt the sleep
        const check = setInterval(() => {
          if (isShuttingDown) { clearTimeout(t); clearInterval(check); resolve(); }
        }, 500);
        t.then?.(() => clearInterval(check));
        // t is a NodeJS.Timeout — attach cleanup via signal
      });

      // Exponential back-off
      delayMs = Math.min(delayMs * 2, MAX_DELAY_MS);
    }
  }

  writeHealth({ status: "disconnected", lastError: null });
  log("INFO", "Service stopped cleanly.");
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function handleShutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log("INFO", `Received ${signal} — shutting down gracefully…`);
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT",  () => handleShutdown("SIGINT"));

// ─── Entry point ──────────────────────────────────────────────────────────────

startService().catch((err) => {
  log("ERROR", "Fatal error in service loop", err);
  process.exit(1);
});
